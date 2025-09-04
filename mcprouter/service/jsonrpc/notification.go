package jsonrpc

import "encoding/json"

// Notification is a JSON-RPC notification.
type Notification struct {
	BaseRequest
	Params interface{} `json:"params,omitempty"`
}

// NewNotification creates a new JSON-RPC notification.
func NewNotification(method string, params interface{}) *Notification {
	return &Notification{
		BaseRequest: BaseRequest{
			JSONRPC: JSONRPC_VERSION,
			Method:  method,
		},
		Params: params,
	}
}

// UnmarshalNotification unmarshals a JSON-RPC notification.
func UnmarshalNotification(data []byte) (*Notification, error) {
	var n Notification

	if err := json.Unmarshal(data, &n); err != nil {
		return nil, err
	}

	return &n, nil
}
