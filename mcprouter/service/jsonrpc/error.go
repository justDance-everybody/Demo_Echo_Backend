package jsonrpc

import "fmt"

// Error is a JSON-RPC error.
type Error struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// Error returns the string representation of the error.
func (e *Error) Error() string {
	return fmt.Sprintf("[%d] %s", e.Code, e.Message)
}

// NewError creates a new JSON-RPC error.
func NewError(code int, message string, data interface{}) *Error {
	return &Error{
		Code:    code,
		Message: message,
		Data:    data,
	}
}

var (
	// ErrorParseError is the error returned when the request is not valid.
	ErrorParseError = NewError(-32700, "Parse error", nil)

	// ErrorInvalidRequest is the error returned when the request is not valid.
	ErrorInvalidRequest = NewError(-32600, "Invalid Request", nil)

	// ErrorMethodNotFound is the error returned when the method is not found.
	ErrorMethodNotFound = NewError(-32601, "Method not found", nil)

	// ErrorInvalidParams is the error returned when the parameters are not valid.
	ErrorInvalidParams = NewError(-32602, "Invalid params", nil)

	// ErrorInternalError is the error returned when the internal error occurs.
	ErrorInternalError = NewError(-32603, "Internal error", nil)

	// ErrorProxyError is the error returned when the proxy error occurs.
	ErrorProxyError = NewError(-32000, "Proxy error, Please restart client", nil)
)
