package api

import (
	"github.com/go-playground/validator/v10"
)

// Validator: custom validator
type Validator struct {
	valid *validator.Validate
}

// Validate: valid request
func (v *Validator) Validate(data interface{}) error {
	if err := v.valid.Struct(data); err != nil {

		return err
	}

	return nil
}

// NewValidator: new validator
func NewValidator() *Validator {
	return &Validator{
		valid: validator.New(),
	}
}
