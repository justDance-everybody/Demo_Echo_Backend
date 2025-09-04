package proxy

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/labstack/echo/v4"
)

// SSEWriter is a writer for SSE response
type SSEWriter struct {
	w http.ResponseWriter
	f http.Flusher
}

// NewSSEWriter will create SSE writer from request context
func NewSSEWriter(c echo.Context) (*SSEWriter, error) {
	w := c.Response().Writer
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")

	flusher, ok := w.(http.Flusher)
	if !ok {
		return nil, errors.New("SSE not supported")
	}

	return &SSEWriter{
		w: w,
		f: flusher,
	}, nil
}

// SendEventData will send the event data to the client
func (s *SSEWriter) SendEventData(event string, data string) error {
	if _, err := fmt.Fprintf(s.w, "event: %s\ndata: %s\n\n", event, data); err != nil {
		return err
	}

	s.f.Flush()

	return nil
}

// SendData will send the data to the client
func (s *SSEWriter) SendData(data string) error {
	if _, err := fmt.Fprintf(s.w, "data: %s\n\n", data); err != nil {
		return err
	}

	s.f.Flush()

	return nil
}

// SendMessage will send the message to the client
func (s *SSEWriter) SendMessage(message string) error {
	return s.SendEventData("message", message)
}

// SendHeartbeat will send the message to the client
func (s *SSEWriter) SendHeartbeat() error {
	return s.SendEventData("heartbeat", ":\n")
}
