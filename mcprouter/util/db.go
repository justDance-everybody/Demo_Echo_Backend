package util

import (
	"fmt"
	"time"

	"github.com/spf13/viper"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// DBConfig is the config for the database
type DBConfig struct {
	Host         string `json:"host"`
	Port         int    `json:"port"`
	Username     string `json:"username"`
	Password     string `json:"password"`
	Database     string `json:"database"`
	Charset      string `json:"charset"`
	Timezone     string `json:"timezone"`
	SSLMode      string `json:"sslmode"`
	Debug        bool   `json:"debug"`
	MaxIdleConns int    `json:"maxIdleConns"`
	MaxOpenConns int    `json:"maxOpenConns"`
	MaxLifetime  int    `json:"maxLifetime"`
}

var dbch = make(chan map[string]*gorm.DB)

// InitDBWithName initializes the database connection
func InitDBWithName(name string) error {
	var conf DBConfig
	sub := viper.Sub("db." + name)
	if sub == nil {
		return fmt.Errorf("invalid db config under %s", name)
	}
	if err := sub.Unmarshal(&conf); err != nil {
		return err
	}

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%d sslmode=%s TimeZone=%s",
		conf.Host, conf.Username, conf.Password, conf.Database, conf.Port, conf.SSLMode, conf.Timezone)

	fmt.Printf("init db %s with dsn: %s\n", name, dsn)

	// https://github.com/go-gorm/postgres
	db, err := gorm.Open(postgres.New(postgres.Config{
		DSN:                  dsn,
		PreferSimpleProtocol: true, // disables implicit prepared statement usage
	}), &gorm.Config{})

	if err != nil {
		return err
	}

	sqlDB, err := db.DB()
	if err != nil {
		return err
	}

	if conf.MaxIdleConns > 0 {
		sqlDB.SetMaxIdleConns(conf.MaxIdleConns)
	}
	if conf.MaxOpenConns > 0 {
		sqlDB.SetMaxOpenConns(conf.MaxOpenConns)
	}
	if conf.MaxLifetime > 0 {
		sqlDB.SetConnMaxLifetime(time.Duration(conf.MaxLifetime) * time.Second)
	}
	if conf.Debug {
		db = db.Debug()
	}

	// set db
	dbch <- map[string]*gorm.DB{name: db}

	return nil
}

// GetClient gets the database connection
func GetClient(name string) *gorm.DB {
	dbm := <-dbch
	if db, ok := dbm[name]; ok {
		return db
	}

	return nil
}

// GetDB gets the database connection
func GetDB(name string) *gorm.DB {
	return GetClient(name)
}

func dbPool() {
	var dbs = make(map[string]*gorm.DB)
	for {
		select {
		case dbm := <-dbch:
			for name, db := range dbm {
				dbs[name] = db
			}
		case dbch <- dbs:
		}
	}
}

func init() {
	go dbPool()
}
