package mcpserver

import (
	"encoding/json"
	"fmt"

	"github.com/chatmcp/mcprouter/model"
)

type Server struct {
	Name        string      `json:"name"`
	Description string      `json:"description"`
	Config      interface{} `json:"config"`
}

func GetHostedServers(page int, limit int) ([]*Server, error) {
	servers := []*Server{}
	allowCall := true
	projects, err := model.GetProjectsWithFilters(model.ProjectFilter{
		Type:      "server",
		AllowCall: &allowCall,
		Status:    "created",
		Page:      page,
		Limit:     limit,
	})
	if err != nil {
		return nil, err
	}

	for _, project := range projects {
		config := map[string]interface{}{}
		if project.ServerParams != "" {
			err := json.Unmarshal([]byte(project.ServerParams), &config)
			if err != nil {
				fmt.Println("error unmarshalling server params", err)
			}
		}

		servers = append(servers, &Server{
			Name:        project.Name,
			Description: project.Description,
			Config:      config,
		})
	}

	return servers, nil
}
