package model

import (
	"math/rand"
	"time"
)

const (
	ProjectStatusCreated = "created"
	ProjectStatusDeleted = "deleted"
)

// Project is the model for the project table
type Project struct {
	ID              string    `json:"-"`
	UUID            string    `json:"uuid"`
	Name            string    `json:"name"`
	Title           string    `json:"title"`
	Description     string    `json:"description"`
	AvatarURL       string    `json:"avatar_url"`
	CreatedAt       time.Time `json:"created_at"`
	Status          string    `json:"status"`
	AuthorName      string    `json:"author_name"`
	AuthorAvatarURL string    `json:"author_avatar_url"`
	Tags            string    `json:"tags"`
	Category        string    `json:"category"`
	IsFeatured      bool      `json:"is_featured"`
	Sort            int       `json:"sort"`
	URL             string    `json:"url"`
	Type            string    `json:"type"`
	UserUUID        string    `json:"user_uuid"`
	Tools           string    `json:"tools"`
	SSEURL          string    `json:"sse_url"`
	SSEProvider     string    `json:"sse_provider"`
	SSEParams       string    `json:"sse_params"`
	ServerCommand   string    `json:"server_command"`
	ServerParams    string    `json:"server_params"`
	ServerConfig    string    `json:"server_config"`
	AllowCall       bool      `json:"allow_call"`
}

// TableName returns the table name for the project model
func (p *Project) TableName() string {
	return "projects"
}

// FindProjectByUUID finds a project by its UUID
func FindProjectByUUID(uuid string) (*Project, error) {
	project := &Project{}
	err := db().
		Where("uuid = ?", uuid).
		Where("status = ?", ProjectStatusCreated).
		First(project).Error

	if err != nil {
		return nil, err
	}

	return project, nil
}

func GetProjects() ([]*Project, error) {
	projects := []*Project{}
	err := db().Where("status = ?", ProjectStatusCreated).Find(&projects).Error
	if err != nil {
		return nil, err
	}

	return projects, nil
}

// ProjectFilter contains filter options for querying projects
type ProjectFilter struct {
	UserUUID   string
	Status     string
	Keyword    string
	Type       string
	Category   string
	Tag        string
	IsFeatured *bool
	IsOfficial *bool
	IsRandom   bool
	AllowCall  *bool
	Page       int
	Limit      int
	OrderBy    string
}

// GetProjectsWithFilters gets projects with various filters
func GetProjectsWithFilters(filter ProjectFilter) ([]*Project, error) {
	// Default values
	page := 1
	limit := 60
	orderBy := "sort"

	// Extract pagination and ordering params if provided
	if filter.Page > 0 {
		page = filter.Page
	}
	if filter.Limit > 0 {
		limit = filter.Limit
	}
	if filter.OrderBy != "" {
		orderBy = filter.OrderBy
	}

	// Start building the query
	query := db().Model(&Project{})

	if filter.UserUUID != "" {
		query = query.Where("user_uuid = ?", filter.UserUUID)
	}

	if filter.Keyword != "" {
		query = query.Where("name ILIKE ? OR title ILIKE ? OR description ILIKE ?",
			"%"+filter.Keyword+"%", "%"+filter.Keyword+"%", "%"+filter.Keyword+"%")
	}

	if filter.Category != "" {
		query = query.Where("category = ?", filter.Category)
	} else if filter.Tag != "" {
		query = query.Where("tags ILIKE ?", "%"+filter.Tag+"%")
	}

	if filter.IsFeatured != nil {
		query = query.Where("is_featured = ?", *filter.IsFeatured)
	}

	if filter.IsOfficial != nil {
		query = query.Where("is_official = ?", *filter.IsOfficial)
	}

	if filter.AllowCall != nil {
		query = query.Where("allow_call = ?", *filter.AllowCall)
	}

	if filter.Type != "" {
		if filter.Type == "server" {
			query = query.Where("type IS NULL OR type = 'server'")
		} else {
			query = query.Where("type = ?", filter.Type)
		}
	}

	// Apply filters
	if filter.Status != "" {
		query = query.Where("status = ?", filter.Status)
	} else {
		query = query.Where("status = ?", ProjectStatusCreated)
	}

	// Apply ordering
	query = query.Order(orderBy + " DESC")
	query = query.Order("created_at DESC")

	// Apply pagination
	offset := (page - 1) * limit
	query = query.Offset(offset).Limit(limit)

	// Enable SQL logging to see the final query
	query = query.Debug()

	// Execute query
	projects := []*Project{}
	err := query.Find(&projects).Error
	if err != nil {
		return nil, err
	}

	// Handle random sorting if needed
	if filter.IsRandom {
		// Shuffle the projects array for random ordering
		r := rand.New(rand.NewSource(time.Now().UnixNano()))
		r.Shuffle(len(projects), func(i, j int) {
			projects[i], projects[j] = projects[j], projects[i]
		})
	}

	return projects, nil
}
