package jsonrpc

import "encoding/json"

// Response is a JSON-RPC response.
type Response struct {
	BaseResponse
	Result interface{} `json:"result,omitempty"`
	Error  *Error      `json:"error,omitempty"`
}

// String returns the string representation of the response.
func (r *Response) String() string {
	b, _ := json.Marshal(r)

	return string(b)
}

// UnmarshalResult unmarshals the result into a given value.
func (r *Response) UnmarshalResult(v interface{}) error {
	b, err := json.Marshal(r.Result)
	if err != nil {
		return err
	}

	return json.Unmarshal(b, v)
}

// NewResultResponse creates a new result response.
func NewResultResponse(result interface{}, id interface{}) *Response {
	return &Response{
		BaseResponse: BaseResponse{
			JSONRPC: JSONRPC_VERSION,
			ID:      id,
		},
		Result: result,
	}
}

// NewErrorResponse creates a new error response.
func NewErrorResponse(err *Error, id interface{}) *Response {
	return &Response{
		BaseResponse: BaseResponse{
			JSONRPC: JSONRPC_VERSION,
			ID:      id,
		},
		Error: err,
	}
}

// UnmarshalResponse unmarshals a JSON-RPC response.
func UnmarshalResponse(data []byte) (*Response, error) {
	var j Response

	if err := json.Unmarshal(data, &j); err != nil {
		return nil, err
	}

	return &j, nil
}
