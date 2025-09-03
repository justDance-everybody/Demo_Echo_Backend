package proxy

import (
	"fmt"

	"github.com/chatmcp/mcprouter/service/mcpclient"
	"github.com/chatmcp/mcprouter/service/mcpserver"
)

// SSESession is a session for SSE request
type SSESession struct {
	writer       *SSEWriter
	done         chan struct{} // done channel
	messages     chan string   // event queue
	serverConfig *mcpserver.ServerConfig
	proxyInfo    *ProxyInfo
	client       mcpclient.Client
}

// NewSSESession will create a new SSE session
func NewSSESession(w *SSEWriter, serverConfig *mcpserver.ServerConfig, proxyInfo *ProxyInfo) *SSESession {
	return &SSESession{
		writer:       w,
		done:         make(chan struct{}),
		messages:     make(chan string, 100), // store messages
		serverConfig: serverConfig,
		proxyInfo:    proxyInfo,
		client:       nil,
	}
}

// ServerConfig returns the server config of the session
func (s *SSESession) ServerConfig() *mcpserver.ServerConfig {
	return s.serverConfig
}

// ProxyInfo returns the proxy info of the session
func (s *SSESession) ProxyInfo() *ProxyInfo {
	return s.proxyInfo
}

// Key returns the key of the session
func (s *SSESession) Key() string {
	return s.proxyInfo.ServerKey
}

// Command returns the command of the session
func (s *SSESession) Command() string {
	return s.proxyInfo.ServerCommand
}

// SetProxyInfo sets the proxy info of the session
func (s *SSESession) SetProxyInfo(proxyInfo *ProxyInfo) {
	s.proxyInfo = proxyInfo
}

// SetClient sets the client of the session
func (s *SSESession) SetClient(client mcpclient.Client) {
	s.client = client
}

// Client returns the client of the session
func (s *SSESession) Client() mcpclient.Client {
	return s.client
}

// Messages returns the messages channel of the session
func (s *SSESession) Messages() chan string {
	return s.messages
}

// SendMessage sends a message to the session
func (s *SSESession) SendMessage(message string) {
	select {
	case s.messages <- message:
		// send message to client ok
	case <-s.done:
		fmt.Printf("session is closed\n")
	default:
		fmt.Printf("message channel is full\n")
	}
}

// Close closes the session
func (s *SSESession) Close() {
	s.CloseClient()
	close(s.done)
}

func (s *SSESession) CloseClient() {
	if s.client != nil {
		s.client.Close()
		fmt.Printf("client closed\n")
	}
}

// Done returns the done channel of the session
func (s *SSESession) Done() chan struct{} {
	return s.done
}
