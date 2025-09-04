package cmd

import (
	"log"

	"github.com/chatmcp/mcprouter/router"
	"github.com/chatmcp/mcprouter/service/proxy"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

var proxyConfigFile string

// startProxyServer starts the sse server
func startProxyServer(port int) {
	s := proxy.NewSSEServer()

	s.Route(router.ProxyRoute)
	s.Start(port)
}

// proxyCmd represents the proxy command
var proxyCmd = &cobra.Command{
	Use:   "proxy",
	Short: "start proxy server",
	Long:  `start proxy server`,
	Run: func(cmd *cobra.Command, args []string) {
		if err := Init(); err != nil {
			log.Printf("init failed with error: %v", err)
			return
		}

		port := viper.GetInt("proxy_server.port")
		if port == 0 {
			port = 8025
		}

		startProxyServer(port)
	},
}

func init() {
	rootCmd.AddCommand(proxyCmd)

	proxyCmd.Flags().StringVarP(&proxyConfigFile, "config", "c", ".env.toml", "config file (default is .env.toml)")
}
