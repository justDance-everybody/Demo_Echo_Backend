package proxy

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/chatmcp/mcprouter/util"
	"github.com/spf13/viper"
)

const (
	proxyInfoKey = "pi_%s"
)

// 获取Redis操作接口
func getRedisHandler() (util.RedisHandler, error) {
	handler := util.GetRedisHandler(viper.GetString("app.cache_name"))
	if handler == nil {
		return nil, fmt.Errorf("redis handler not found")
	}

	return handler, nil
}

func getRedisContext() (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), 5*time.Second)
}

// StoreProxyInfo stores the proxy info to redis
func StoreProxyInfo(sessionID string, proxyInfo *ProxyInfo) error {
	ctx, cancel := getRedisContext()
	defer cancel()

	handler, err := getRedisHandler()
	if err != nil {
		return err
	}

	b, err := json.Marshal(proxyInfo)
	if err != nil {
		return err
	}

	cacheKey := fmt.Sprintf(proxyInfoKey, sessionID)
	expires := 30 * 24 * time.Hour // 30 days

	return handler.Set(ctx, cacheKey, b, expires).Err()
}

// GetProxyInfo gets the proxy info from redis
func GetProxyInfo(sessionID string) (*ProxyInfo, error) {
	ctx, cancel := getRedisContext()
	defer cancel()

	handler, err := getRedisHandler()
	if err != nil {
		return nil, err
	}

	cacheKey := fmt.Sprintf(proxyInfoKey, sessionID)

	b, err := handler.Get(ctx, cacheKey).Bytes()
	if err != nil || b == nil {
		return nil, errors.New("cache not found")
	}

	proxyInfo := &ProxyInfo{}
	if err := json.Unmarshal(b, proxyInfo); err != nil {
		return nil, err
	}

	return proxyInfo, nil
}

// DeleteProxyInfo deletes the proxy info from redis
func DeleteProxyInfo(sessionID string) error {
	ctx, cancel := getRedisContext()
	defer cancel()

	handler, err := getRedisHandler()
	if err != nil {
		return err
	}

	cacheKey := fmt.Sprintf(proxyInfoKey, sessionID)
	handler.Del(ctx, cacheKey)

	return nil
}
