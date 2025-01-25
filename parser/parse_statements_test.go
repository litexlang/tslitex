package parser

import (
	"fmt"
	"testing"
)

// Test function for parseFuncPtyStmt
func TestParseFuncPtyStmt(t *testing.T) {
	tokens := []string{"$", "<", "(", "1", ",", "2", ")"}
	tokenStmt := TokenStmt{tokens, nil}
	stmt := LitexParser.parseFuncPtyStmt(&tokenStmt)
	if err := LitexParser.Err(); err != nil {
		t.Error(err)
	}

	// print stmt
	fmt.Println(fmt.Sprintf("%v", stmt))
}

func TestParsePtyStmt(t *testing.T) {
	tokens := []string{"$", "<", "(", "1", ",", "2", ")"}
	tokenStmt := TokenStmt{tokens, nil}
	stmt := LitexParser.ParseStmt(&tokenStmt)
	if err := LitexParser.Err(); err != nil {
		t.Error(err)
	}
	fmt.Println(fmt.Sprintf("%v", stmt))
}

func TestParseIfStmt(t *testing.T) {
	tokens := []string{"if", "[", "G", "Group", "]", "(", "v", "G", ")", ":"}
	tokens2 := []string{"$", "<", "(", "1", ",", "2", ")"}
	tokenStmt2 := TokenStmt{tokens2, nil}

	body := []TokenStmt{tokenStmt2}
	tokenStmt := TokenStmt{tokens, &body}
	stmt := LitexParser.ParseStmt(&tokenStmt)
	if err := LitexParser.Err(); err != nil {
		t.Error(err)
	}
	fmt.Println(fmt.Sprintf("%v", stmt))
}
