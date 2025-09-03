package util

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/spf13/viper"
)

// RedisConfig is the config for the redis
type RedisConfig struct {
	Host     string
	Port     int64
	Password string
	DB       int
	PoolSize int
	Cluster  bool
}

// RedisHandler interface abstracts Redis and Cluster client operations
type RedisHandler interface {
	Set(ctx context.Context, key string, value interface{}, expiration time.Duration) *redis.StatusCmd
	Get(ctx context.Context, key string) *redis.StringCmd
	Del(ctx context.Context, keys ...string) *redis.IntCmd
	Ping(ctx context.Context) *redis.StatusCmd
	Close() error
}

// StdRedisClient wraps standard Redis client to implement RedisHandler
type StdRedisClient struct {
	*redis.Client
}

// ClusterRedisClient wraps cluster Redis client to implement RedisHandler
type ClusterRedisClient struct {
	*redis.ClusterClient
}

// redisManager safely manages all Redis connections
type redisManager struct {
	mu       sync.RWMutex
	handlers map[string]RedisHandler
}

// Global connection manager
var redisMgr = &redisManager{
	handlers: make(map[string]RedisHandler),
}

// InitRedisWithName initializes the redis connection
func InitRedisWithName(name string) error {
	var conf RedisConfig
	sub := viper.Sub("cache." + name)
	if sub == nil {
		return fmt.Errorf("invalid redis config under %s", name)
	}
	if err := sub.Unmarshal(&conf); err != nil {
		return err
	}

	if conf.Port == 0 {
		conf.Port = 6379
	}

	// Check if hostname contains AWS ElastiCache indicators or explicit cluster flag
	isCluster := conf.Cluster ||
		strings.Contains(conf.Host, ".cache.amazonaws.com") ||
		strings.Contains(conf.Host, "clustercfg")

	var handler RedisHandler

	if isCluster {
		clusterOpts := &redis.ClusterOptions{
			Addrs:    []string{fmt.Sprintf("%s:%d", conf.Host, conf.Port)},
			Password: conf.Password,
			ReadOnly: true,
		}

		if conf.PoolSize > 0 {
			clusterOpts.PoolSize = conf.PoolSize
		}

		clusterClient := redis.NewClusterClient(clusterOpts)
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		if _, err := clusterClient.Ping(ctx).Result(); err != nil {
			clusterClient.Close()
			return fmt.Errorf("failed to connect to Redis Cluster: %v", err)
		}

		handler = &ClusterRedisClient{ClusterClient: clusterClient}
	} else {
		opts := &redis.Options{
			Addr:     fmt.Sprintf("%s:%d", conf.Host, conf.Port),
			Password: conf.Password,
			DB:       conf.DB,
		}

		if conf.PoolSize > 0 {
			opts.PoolSize = conf.PoolSize
		}

		client := redis.NewClient(opts)
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		if _, err := client.Ping(ctx).Result(); err != nil {
			client.Close()
			return fmt.Errorf("failed to connect to Redis: %v", err)
		}

		handler = &StdRedisClient{Client: client}
	}

	// Thread-safe store of the handler
	redisMgr.mu.Lock()
	// Close existing connection if any
	if oldHandler, exists := redisMgr.handlers[name]; exists {
		_ = oldHandler.Close()
	}
	redisMgr.handlers[name] = handler
	redisMgr.mu.Unlock()

	return nil
}

// GetRedisHandler returns a Redis handler
func GetRedisHandler(name string) RedisHandler {
	redisMgr.mu.RLock()
	defer redisMgr.mu.RUnlock()

	handler, ok := redisMgr.handlers[name]
	if !ok {
		return nil
	}

	return handler
}

// For backward compatibility
func GetRedisClient(name string) *redis.Client {
	handler := GetRedisHandler(name)
	if handler == nil {
		return nil
	}

	stdClient, ok := handler.(*StdRedisClient)
	if !ok {
		return nil
	}

	return stdClient.Client
}

// For backward compatibility
func GetRedisClusterClient(name string) *redis.ClusterClient {
	handler := GetRedisHandler(name)
	if handler == nil {
		return nil
	}

	clusterClient, ok := handler.(*ClusterRedisClient)
	if !ok {
		return nil
	}

	return clusterClient.ClusterClient
}

// CloseAllConnections closes all Redis connections
func CloseAllConnections() {
	redisMgr.mu.Lock()
	defer redisMgr.mu.Unlock()

	for name, handler := range redisMgr.handlers {
		if err := handler.Close(); err != nil {
			fmt.Printf("Error closing Redis connection %s: %v\n", name, err)
		}
		delete(redisMgr.handlers, name)
	}
}
