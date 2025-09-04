package mcpserver

// GetServerCommand returns the command for the given key
func GetServerCommand(key string) string {
	config := GetServerConfig(key)
	if config == nil {
		return ""
	}

	return config.Command
}
