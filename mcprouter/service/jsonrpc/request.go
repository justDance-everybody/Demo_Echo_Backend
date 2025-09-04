package jsonrpc

import "encoding/json"

// Request is a JSON-RPC request.
type Request struct {
	BaseRequest
	Params interface{} `json:"params,omitempty"`
	Result interface{} `json:"result,omitempty"`
	Error  *Error      `json:"error,omitempty"`
}

// NewRequest creates a new JSON-RPC request.
func NewRequest(method string, params interface{}, id interface{}) *Request {
	return &Request{
		BaseRequest: BaseRequest{
			JSONRPC: JSONRPC_VERSION,
			Method:  method,
			ID:      id,
		},
		Params: params,
	}
}

// UnmarshalRequest unmarshals a JSON-RPC request.
func UnmarshalRequest(data []byte) (*Request, error) {
	var r Request

	if err := json.Unmarshal(data, &r); err != nil {
		return nil, err
	}

	return &r, nil
}
