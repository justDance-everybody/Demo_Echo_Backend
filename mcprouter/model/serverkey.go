package model

import "time"

type ServerKeyStatus string

const (
	ServerKeyStatusCreated ServerKeyStatus = "created"
	ServerKeyStatusDeleted ServerKeyStatus = "deleted"
)

// Serverkey is the model for the serverkey table
type Serverkey struct {
	ID            string    `json:"-"`
	ServerKey     string    `json:"server_key"`
	ServerUUID    string    `json:"server_uuid"`
	ServerName    string    `json:"server_name"`
	ServerCommand string    `json:"server_command"`
	ServerParams  string    `json:"server_params"`
	Status        string    `json:"status"`
	CreatedAt     time.Time `json:"created_at"`
	UserUUID      string    `json:"user_uuid"`
}

// TableName returns the table name for the serverkey model
func (s *Serverkey) TableName() string {
	return "serverkeys"
}

// FindServerkeyByServerKey finds a serverkey by its server key
func FindServerkeyByServerKey(serverKey string) (*Serverkey, error) {
	serverkey := &Serverkey{}

	err := db().
		Where("server_key = ?", serverKey).
		Where("status = ?", ServerKeyStatusCreated).
		Order("created_at DESC").
		First(&serverkey).Error

	if err != nil {
		return nil, err
	}

	return serverkey, nil
}
