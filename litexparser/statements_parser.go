package litexparser

import (
	"fmt"
	"strings"
)

type parseStmtErr struct {
	previous error
	stmt     TokenBlock
}

func (e *parseStmtErr) Error() string {
	curTok, err := e.stmt.Header.currentToken()
	if err != nil {
		return fmt.Sprintf("error at %s, column %d: %s", e.stmt.Header.String(), e.stmt.Header.getIndex(), e.previous.Error())
	} else {
		return fmt.Sprintf("error at %s, column %d, at '%s': %s", e.stmt.Header.String(), e.stmt.Header.getIndex(), curTok, e.previous.Error())
	}
}

func ParseSourceCode(code string) (*[]TopStmt, error) {
	code = strings.ReplaceAll(code, "\t", "    ")

	slice, err := getTopLevelStmtSlice(code)
	if err != nil {
		return nil, err
	}

	blocks := []TokenBlock{}
	for _, strBlock := range slice.body {
		block, err := TokenizeStmtBlock(&strBlock)
		if err != nil {
			return nil, err
		}
		blocks = append(blocks, *block)
	}

	ret := []TopStmt{}
	for _, block := range blocks {
		cur, err := block.ParseTopLevelStmt()
		if err != nil {
			return nil, err
		}
		ret = append(ret, *cur)
		fmt.Printf("%v\n", cur)
	}

	return &ret, nil
}

func (stmt *TokenBlock) ParseTopLevelStmt() (*TopStmt, error) {
	pub := false
	if stmt.Header.is(BuiltinSyms["pub"]) {
		stmt.Header.skip()
		pub = true
	}

	ret, err := stmt.ParseStmt()
	if err != nil {
		return nil, &parseStmtErr{err, *stmt}
	}

	return &TopStmt{ret, pub}, nil
}

func (stmt *TokenBlock) ParseStmt() (Stmt, error) {
	cur, err := stmt.Header.currentToken()
	if err != nil {
		return nil, &parseStmtErr{err, *stmt}
	}

	var ret Stmt
	switch cur {
	case Keywords["concept"]:
		ret, err = stmt.parseDefConceptStmt()
	case Keywords["type"]:
		ret, err = stmt.parseDefTypeStmt()
	case Keywords["property"]:
		ret, err = stmt.parseDefPropertyStmt()
	case Keywords["fn"]:
		ret, err = stmt.parseDefFnStmt()
	case Keywords["var"]:
		ret, err = stmt.parseDefVarStmt()
	case Keywords["claim"]:
		ret, err = stmt.parseClaimStmt()
	case Keywords["proof"]:
		ret, err = stmt.parseProofClaimStmt()
	case Keywords["use"]:
		ret, err = stmt.parseDefUseStmt()
	case Keywords["know"]:
		ret, err = stmt.parseKnowStmt()
	case Keywords["exist"]:
		ret, err = stmt.parseExistStmt()
	case Keywords["have"]:
		ret, err = stmt.parseHaveStmt()
	case Keywords["member"]:
		ret, err = stmt.parseMemberStmt()
	case Keywords["type_member"]:
		ret, err = stmt.parseTypeMemberStmt()
	default:
		ret, err = stmt.parseFactStmt()
	}

	if err != nil {
		return nil, &parseStmtErr{err, *stmt}
	}

	if !stmt.Header.ExceedEnd() {
		return nil, &parseStmtErr{err, *stmt}
	}

	return ret, nil
}

func (p *TokenBlock) parseFcMember() (*[]FcVarDecl, *[]FcFnDecl, *[]PropertyDecl, error) {
	p.Header.next()
	if err := p.Header.testAndSkip(BuiltinSyms[":"]); err != nil {
		return nil, nil, nil, err
	}

	varMember := &[]FcVarDecl{}
	fnMember := &[]FcFnDecl{}
	propertyMember := &[]PropertyDecl{}

	for _, curStmt := range p.Body {
		if curStmt.Header.is(Keywords["var"]) {
			member, err := curStmt.Header.parseVarDecl()
			if err != nil {
				return nil, nil, nil, err
			}
			*varMember = append(*varMember, *member)
		} else if curStmt.Header.is(Keywords["fn"]) {
			member, err := curStmt.Header.parseFcFnDecl()
			if err != nil {
				return nil, nil, nil, err
			}
			*fnMember = append(*fnMember, *member)
		} else if curStmt.Header.is(Keywords["property"]) {
			member, err := curStmt.Header.parsePropertyDecl()
			if err != nil {
				return nil, nil, nil, err
			}
			*propertyMember = append(*propertyMember, *member)
		}
	}

	return varMember, fnMember, propertyMember, nil
}

func (stmt *TokenBlock) parseThenFacts() (*[]factStmt, error) {
	stmt.Header.next()
	if err := stmt.Header.testAndSkip(BuiltinSyms[":"]); err != nil {
		return nil, err
	}

	facts := &[]factStmt{}

	for _, curStmt := range stmt.Body {
		if curStmt.Header.is(Keywords["fact"]) {
			fact, err := curStmt.parseFactStmt()
			if err != nil {
				return nil, err
			}
			*facts = append(*facts, fact)
		}
	}

	return facts, nil
}

// func (p *tokenBlock) parseFnRetTypeMember() (*[]fnRetTypeMemberDecl, error) {
// 	p.header.next()
// 	if err := p.header.testAndSkip(BuiltinSyms[":"]); err != nil {
// 		return nil, err
// 	}

// 	member := &[]fnRetTypeMemberDecl{}

// 	for _, curStmt := range p.body {
// 		if curStmt.header.is(Keywords["var"]) {
// 			v, err := curStmt.header.parseVarDecl()
// 			if err != nil {
// 				return nil, err
// 			}
// 			*member = append(*member, v)
// 		} else if curStmt.header.is(Keywords["fn"]) {
// 			v, err := curStmt.header.parseFcFnDecl()
// 			if err != nil {
// 				return nil, err
// 			}
// 			*member = append(*member, v)

// 		} else {
// 			return nil, fmt.Errorf("unexpected declaration %v", curStmt.header)
// 		}
// 	}

// 	return member, nil
// }

func (stmt *TokenBlock) parseDefConceptStmt() (*DefConceptStmt, error) {
	stmt.Header.skip()

	typeVariable, err := stmt.Header.next()
	if err != nil {
		return nil, &parseStmtErr{err, *stmt}
	}

	fcType, err := stmt.Header.parseFcType()
	if err != nil {
		return nil, &parseStmtErr{err, *stmt}
	}

	conceptName, err := stmt.Header.next()
	if err != nil {
		return nil, &parseStmtErr{err, *stmt}
	}

	if !stmt.Header.is(BuiltinSyms[":"]) {
		return &DefConceptStmt{TypeVarStr(typeVariable), fcType, TypeConceptStr(conceptName), []TypeConceptStr{}, []FcVarDecl{}, []FcFnDecl{}, []PropertyDecl{}, []FcVarDecl{}, []FcFnDecl{}, []PropertyDecl{}, []factStmt{}}, nil
	} else {
		stmt.Header.next()
	}

	inherit := &[]TypeConceptStr{}
	typeVarMember := &[]FcVarDecl{}
	typeFnMember := &[]FcFnDecl{}
	typePropertyMember := &[]PropertyDecl{}
	varMember := &[]FcVarDecl{}
	fnMember := &[]FcFnDecl{}
	propertyMember := &[]PropertyDecl{}
	thenFacts := &[]factStmt{}

	for _, curStmt := range stmt.Body {
		if curStmt.Header.is(Keywords["inherit"]) {
			inherit, err = curStmt.parseInherit()
			if err != nil {
				return nil, &parseStmtErr{err, *stmt}
			}
		} else if curStmt.Header.is(Keywords["type_member"]) {
			typeVarMember, typeFnMember, typePropertyMember, err = curStmt.parseFcMember()
			if err != nil {
				return nil, &parseStmtErr{err, *stmt}
			}
		} else if curStmt.Header.is(Keywords["member"]) {
			varMember, fnMember, propertyMember, err = curStmt.parseFcMember()
			if err != nil {
				return nil, &parseStmtErr{err, *stmt}
			}
		} else if curStmt.Header.is(Keywords["then"]) {
			thenFacts, err = curStmt.parseThenFacts()
			if err != nil {
				return nil, &parseStmtErr{err, *stmt}
			}
		}
	}

	return &DefConceptStmt{TypeVarStr(typeVariable), fcType, TypeConceptStr(conceptName), *inherit, *typeVarMember, *typeFnMember, *typePropertyMember, *varMember, *fnMember, *propertyMember, *thenFacts}, nil

}

func (stmt *TokenBlock) parseDefTypeStmt() (*DefTypeStmt, error) {
	err := stmt.Header.skip(Keywords["type"])
	if err != nil {
		return nil, &parseStmtErr{err, *stmt}
	}

	if !stmt.Header.is(Keywords["fn"]) && !stmt.Header.is(Keywords["property"]) && !stmt.Header.is(Keywords["var"]) {
		typeName, err := stmt.Header.next()
		if err != nil {
			return nil, &parseStmtErr{err, *stmt}
		}

		decl := FcVarDecl{FcVarDeclPair{"", FcVarType{"", FcVarTypeStrValue(typeName)}}}

		conceptNameStr := ""
		if stmt.Header.is(Keywords["impl"]) {
			stmt.Header.next()
			conceptNameStr, err = stmt.Header.next()
			if err != nil {
				return nil, &parseStmtErr{err, *stmt}
			}
		}
		conceptName := TypeConceptStr(conceptNameStr)

		return &DefTypeStmt{&decl, conceptName, []FcVarDecl{}, []FcFnDecl{}, []PropertyDecl{}, []FcVarDecl{}, []FcFnDecl{}, []PropertyDecl{}, []factStmt{}}, nil
	}

	decl, err := stmt.parseFcDecl()
	if err != nil {
		return nil, &parseStmtErr{err, *stmt}
	}

	conceptNameStr := ""
	if stmt.Header.is(Keywords["impl"]) {
		stmt.Header.next()
		conceptNameStr, err = stmt.Header.next()
		if err != nil {
			return nil, &parseStmtErr{err, *stmt}
		}
	}
	conceptName := TypeConceptStr(conceptNameStr)

	if !stmt.Header.is(BuiltinSyms[":"]) {
		return &DefTypeStmt{decl, conceptName, []FcVarDecl{}, []FcFnDecl{}, []PropertyDecl{}, []FcVarDecl{}, []FcFnDecl{}, []PropertyDecl{}, []factStmt{}}, nil
	} else {
		stmt.Header.next()
	}

	typeVarMember := &[]FcVarDecl{}
	typeFnMember := &[]FcFnDecl{}
	typePropertyMember := &[]PropertyDecl{}
	varMember := &[]FcVarDecl{}
	fnMember := &[]FcFnDecl{}
	propertyMember := &[]PropertyDecl{}
	thenFacts := &[]factStmt{}

	for _, curStmt := range stmt.Body {
		if curStmt.Header.is(Keywords["type_member"]) {
			typeVarMember, typeFnMember, typePropertyMember, err = curStmt.parseFcMember()
			if err != nil {
				return nil, &parseStmtErr{err, *stmt}
			}
		} else if curStmt.Header.is(Keywords["member"]) {
			varMember, fnMember, propertyMember, err = curStmt.parseFcMember()
			if err != nil {
				return nil, &parseStmtErr{err, *stmt}
			}
		} else if curStmt.Header.is(Keywords["then"]) {
			thenFacts, err = curStmt.parseThenFacts()
			if err != nil {
				return nil, &parseStmtErr{err, *stmt}
			}
		}
	}
	return &DefTypeStmt{decl, conceptName, *typeVarMember, *typeFnMember, *typePropertyMember, *varMember, *fnMember, *propertyMember, *thenFacts}, nil
}

func (stmt *TokenBlock) parseFactStmt() (factStmt, error) {
	if stmt.Header.is(Keywords["forall"]) {
		return stmt.parseForallStmt()
	}

	return stmt.parseNotFactStmt()
}

func (stmt *TokenBlock) parseNotFactStmt() (NotFactStmt, error) {
	isTrue := true
	if stmt.Header.is(BuiltinSyms["not"]) {
		err := stmt.Header.skip(BuiltinSyms["not"])
		if err != nil {
			return nil, &parseStmtErr{err, *stmt}
		}
		isTrue = false
	}

	var ret NotFactStmt
	var err error = nil
	if stmt.Header.is(BuiltinSyms["$"]) {
		ret, err = stmt.parseFuncPropertyFactStmt()
	} else {
		ret, err = stmt.parseRelationalFactStmt()
	}

	if err != nil {
		return nil, &parseStmtErr{err, *stmt}
	}

	ret.notFactStmtSetT(isTrue)
	return ret, nil
}

func (stmt *TokenBlock) parseFuncPropertyFactStmt() (*FuncPtyStmt, error) {
	err := stmt.Header.skip(BuiltinSyms["$"])
	if err != nil {
		return nil, &parseStmtErr{err, *stmt}
	}

	fc, err := stmt.Header.ParseFcExpr()
	if err != nil {
		return nil, &parseStmtErr{err, *stmt}
	}

	return &FuncPtyStmt{true, fc}, nil
}

func (stmt *TokenBlock) parseForallStmt() (*ForallStmt, error) {
	stmt.Header.skip()

	typeParams := &[]TypeConceptPair{}
	var err error = nil
	if stmt.Header.is(BuiltinSyms["["]) {
		typeParams, err = stmt.Header.parseBracketedTypeConceptPairArray()
		if err != nil {
			return nil, &parseStmtErr{err, *stmt}
		}
	}

	varParams, err := stmt.Header.parseFcVarTypePairArrEndWithColon()
	if err != nil {
		return nil, &parseStmtErr{err, *stmt}
	}

	ifFacts := &[]factStmt{}
	thenFacts := &[]factStmt{}

	if len(stmt.Body) > 0 && (stmt.Body)[0].Header.is(Keywords["if"]) {
		ifFacts, err = stmt.Body[0].parseFactsBlock()
		if err != nil {
			return nil, &parseStmtErr{err, *stmt}
		}

		if len(stmt.Body) == 2 && (stmt.Body)[1].Header.is(Keywords["then"]) {
			thenFacts, err = stmt.Body[1].parseFactsBlock()
			if err != nil {
				return nil, &parseStmtErr{err, *stmt}
			}
		} else {
			return nil, fmt.Errorf("expected 'then'")
		}
	} else {
		thenFacts, err = stmt.parseBodyFacts()
		if err != nil {
			return nil, &parseStmtErr{err, *stmt}
		}
	}

	return &ForallStmt{*typeParams, *varParams, *ifFacts, *thenFacts}, nil
}

func (stmt *TokenBlock) parseBodyFacts() (*[]factStmt, error) {
	if len(stmt.Body) == 0 {
		return &[]factStmt{}, nil
	}

	facts := &[]factStmt{}
	for _, f := range stmt.Body {
		fact, err := f.parseFactStmt()
		if err != nil {
			return nil, &parseStmtErr{err, *stmt}
		}
		*facts = append(*facts, fact)
	}

	return facts, nil
}

func (stmt *TokenBlock) parseFactsBlock() (*[]factStmt, error) {
	ifFacts := &[]factStmt{}
	stmt.Header.skip()
	if err := stmt.Header.testAndSkip(BuiltinSyms[":"]); err != nil {
		return nil, &parseStmtErr{err, *stmt}
	}

	for _, curStmt := range stmt.Body {
		fact, err := curStmt.parseFactStmt()
		if err != nil {
			return nil, &parseStmtErr{err, *stmt}
		}
		*ifFacts = append(*ifFacts, fact)
	}

	return ifFacts, nil
}

func (stmt *TokenBlock) parseDefPropertyStmt() (*DefPropertyStmt, error) {
	decl, err := stmt.Header.parsePropertyDecl()
	if err != nil {
		return nil, &parseStmtErr{err, *stmt}
	}

	ifFacts := &[]factStmt{}
	thenFacts := &[]factStmt{}
	if stmt.Header.is(BuiltinSyms[":"]) {
		stmt.Header.skip()
		ifFacts, thenFacts, err = stmt.parseBodyIfFactsThenFacts()
		if err != nil {
			return nil, &parseStmtErr{err, *stmt}
		}
	}

	return &DefPropertyStmt{*decl, *ifFacts, *thenFacts}, nil
}

func (stmt *TokenBlock) parseInherit() (*[]TypeConceptStr, error) {
	stmt.Header.skip(Keywords["inherit"])

	if err := stmt.Header.testAndSkip(BuiltinSyms[":"]); err != nil {
		return nil, &parseStmtErr{err, *stmt}
	}

	types := []TypeConceptStr{}
	for _, curStmt := range stmt.Body {
		cur, err := curStmt.Header.next()
		if err != nil {
			return nil, &parseStmtErr{err, *stmt}
		}
		types = append(types, TypeConceptStr(cur))
		if !curStmt.Header.ExceedEnd() {
			return nil, fmt.Errorf("expect one string in inherit")
		}
	}
	return &types, nil
}

func (stmt *TokenBlock) parseBodyIfFactsThenFacts() (*[]factStmt, *[]factStmt, error) {
	ifFacts := &[]factStmt{}
	thenFacts := &[]factStmt{}
	var err error = nil

	if len(stmt.Body) == 2 && stmt.Body[0].Header.is(Keywords["if"]) && stmt.Body[1].Header.is(Keywords["then"]) {
		stmt.Body[0].Header.skip()
		if err := stmt.Body[0].Header.testAndSkip(BuiltinSyms[":"]); err != nil {
			return nil, nil, err
		}

		ifFacts, err = stmt.Body[0].parseBodyFacts()
		if err != nil {
			return nil, nil, err
		}

		stmt.Body[1].Header.skip()
		if err := stmt.Body[1].Header.testAndSkip(BuiltinSyms[":"]); err != nil {
			return nil, nil, err
		}

		thenFacts, err = stmt.Body[1].parseBodyFacts()
		if err != nil {
			return nil, nil, err
		}
	} else {
		thenFacts, err = stmt.parseBodyFacts()
		if err != nil {
			return nil, nil, err
		}
	}

	return ifFacts, thenFacts, nil
}

func (stmt *TokenBlock) parseDefFnStmt() (*DefFnStmt, error) {
	decl, err := stmt.Header.parseFcFnDecl()
	if err != nil {
		return nil, &parseStmtErr{err, *stmt}
	}

	ifFacts := &[]factStmt{}
	thenFacts := &[]factStmt{}

	if stmt.Header.is(BuiltinSyms[":"]) {
		stmt.Header.skip()
		ifFacts, thenFacts, err = stmt.parseBodyIfFactsThenFacts()
		if err != nil {
			return nil, &parseStmtErr{err, *stmt}
		}
	}

	return &DefFnStmt{*decl, *ifFacts, *thenFacts}, nil
}

func (stmt *TokenBlock) parseDefVarStmt() (*DefVarStmt, error) {
	decl, err := stmt.Header.parseVarDecl()
	if err != nil {
		return nil, &parseStmtErr{err, *stmt}
	}

	ifFacts := &[]factStmt{}

	if stmt.Header.is(BuiltinSyms[":"]) {
		stmt.Header.skip()
		ifFacts, err = stmt.parseBodyFacts()
		if err != nil {
			return nil, &parseStmtErr{err, *stmt}
		}
	} else if !stmt.Header.ExceedEnd() {
		return nil, fmt.Errorf("expect ':' or end of block")
	}

	return &DefVarStmt{*decl, *ifFacts}, nil
}

func (stmt *TokenBlock) parseClaimStmt() (*ClaimStmt, error) {
	stmt.Header.skip()
	var err error = nil

	if err := stmt.Header.testAndSkip(BuiltinSyms[":"]); err != nil {
		return nil, &parseStmtErr{err, *stmt}
	}

	toCheck := &[]factStmt{}
	proof := &[]Stmt{}

	for i := 0; i < len(stmt.Body)-1; i++ {
		if !stmt.Header.is(Keywords["proof"]) {
			fact, err := stmt.Body[i].parseFactStmt()
			if err != nil {
				return nil, &parseStmtErr{err, *stmt}
			}
			*toCheck = append(*toCheck, fact)
		}
	}

	err = stmt.Body[len(stmt.Body)-1].Header.testAndSkip(Keywords["proof"])
	if err != nil {
		return nil, &parseStmtErr{err, *stmt}
	}

	err = stmt.Body[len(stmt.Body)-1].Header.testAndSkip(Keywords[":"])
	if err != nil {
		return nil, &parseStmtErr{err, *stmt}
	}

	for _, block := range stmt.Body[len(stmt.Body)-1].Body {
		curStmt, err := block.ParseStmt()
		if err != nil {
			return nil, &parseStmtErr{err, *stmt}
		}
		*proof = append(*proof, curStmt)
	}

	return &ClaimStmt{*toCheck, *proof}, nil
}

func (stmt *TokenBlock) parseProofClaimStmt() (*ClaimStmt, error) {
	stmt.Header.skip(Keywords["proof"])
	if err := stmt.Header.testAndSkip(BuiltinSyms[":"]); err != nil {
		return nil, &parseStmtErr{err, *stmt}
	}

	innerStmtArr := []Stmt{}
	for _, innerStmt := range stmt.Body {
		curStmt, err := innerStmt.ParseStmt()
		if err != nil {
			return nil, &parseStmtErr{err, *stmt}
		}
		innerStmtArr = append(innerStmtArr, curStmt)
	}

	return &ClaimStmt{[]factStmt{}, innerStmtArr}, nil
}

func (stmt *TokenBlock) parseDefUseStmt() (*DefuseStmt, error) {
	stmt.Header.skip(Keywords["use"])

	name, err := stmt.Header.next()
	if err != nil {
		return nil, &parseStmtErr{err, *stmt}
	}

	variable, err := stmt.Header.parseFcAtom()
	if err != nil {
		return nil, &parseStmtErr{err, *stmt}
	}

	return &DefuseStmt{name, variable}, nil
}

func (stmt *TokenBlock) parseKnowStmt() (*KnowStmt, error) {
	stmt.Header.skip(Keywords["know"])

	if !stmt.Header.is(BuiltinSyms[":"]) {
		facts := []factStmt{}
		fact, err := stmt.parseFactStmt()
		if err != nil {
			return nil, &parseStmtErr{err, *stmt}
		}
		facts = append(facts, fact) // 之所以不能用,让know后面同一行里能有很多很多事实，是因为forall-fact是会换行的
		return &KnowStmt{facts}, nil
	}

	if err := stmt.Header.testAndSkip(BuiltinSyms[":"]); err != nil {
		return nil, &parseStmtErr{err, *stmt}
	}

	facts, err := stmt.parseBodyFacts()
	if err != nil {
		return nil, &parseStmtErr{err, *stmt}
	}

	return &KnowStmt{*facts}, nil
}

func (stmt *TokenBlock) parseExistStmt() (*DefExistStmt, error) {
	decl, err := stmt.Header.parseExistDecl()
	if err != nil {
		return nil, &parseStmtErr{err, *stmt}
	}

	ifFacts := &[]factStmt{}
	member := &[]fcDecl{}
	thenFacts := &[]factStmt{}
	if !stmt.Header.is(BuiltinSyms[":"]) {
		return nil, fmt.Errorf("expected ':‘")
	}

	stmt.Header.skip(BuiltinSyms[":"])

	for _, curStmt := range stmt.Body {
		if curStmt.Header.is(Keywords["if"]) {
			ifFacts, err = curStmt.parseBodyFacts()
			if err != nil {
				return nil, &parseStmtErr{err, *stmt}
			}
			continue
		}
		if curStmt.Header.is(Keywords["then"]) {
			thenFacts, err = curStmt.parseBodyFacts()
			if err != nil {
				return nil, &parseStmtErr{err, *stmt}
			}
			continue
		}
		if curStmt.Header.is(Keywords["members"]) {
			member, err = curStmt.parseFcDecls()
			if err != nil {
				return nil, &parseStmtErr{err, *stmt}
			}
			continue
		}
	}

	return &DefExistStmt{*decl, *ifFacts, *member, *thenFacts}, nil
}

func (stmt *TokenBlock) parseFcDecls() (*[]fcDecl, error) {
	ret := []fcDecl{}

	for _, curStmt := range stmt.Body {
		cur, err := curStmt.parseFcDecl()
		if err != nil {
			return nil, &parseStmtErr{err, *stmt}
		}
		ret = append(ret, cur)
	}

	return &ret, nil
}

func (stmt *TokenBlock) parseFcDecl() (fcDecl, error) {
	if stmt.Header.is(Keywords["fn"]) {
		return stmt.Header.parseFcFnDecl()
	} else if stmt.Header.is(Keywords["var"]) {
		return stmt.Header.parseVarDecl()
	} else if stmt.Header.is(Keywords["property"]) {
		return stmt.Header.parsePropertyDecl()
	}

	return nil, fmt.Errorf("expect 'fn', 'var', or 'property'")
}

func (stmt *TokenBlock) parseHaveStmt() (*HaveStmt, error) {
	stmt.Header.skip(Keywords["have"])
	propertyStmt, err := stmt.parseFuncPropertyFactStmt()
	if err != nil {
		return nil, &parseStmtErr{err, *stmt}
	}

	if !stmt.Header.is(BuiltinSyms[":"]) {
		return nil, fmt.Errorf("expected ':'")
	}

	if len(stmt.Body) != 1 {
		return nil, fmt.Errorf("expect one string in members")
	}

	members, err := stmt.Body[0].Header.parseStringArr()
	if err != nil {
		return nil, &parseStmtErr{err, *stmt}
	}

	if !stmt.Body[0].Header.ExceedEnd() {
		return nil, fmt.Errorf("expected end of block")
	}

	return &HaveStmt{propertyStmt, *members}, nil
}

func (stmt *TokenBlock) parseMemberStmt() (*DefMemberStmt, error) {
	stmt.Header.skip(Keywords["member"])

	typeConcepts, err := stmt.Header.parseBracketedTypeConceptPairArray()
	if err != nil {
		return nil, &parseStmtErr{err, *stmt}
	}

	if len(*typeConcepts) != 1 {
		return nil, fmt.Errorf("expect one type concept in members")
	}

	typeConcept := (*typeConcepts)[0]

	varTypes, err := stmt.Header.parseBracedFcStrTypePairArray()
	if err != nil {
		return nil, &parseStmtErr{err, *stmt}
	}

	if len(*varTypes) != 1 {
		return nil, fmt.Errorf("expect one type in members")
	}

	varType := (*varTypes)[0]

	var decl fcDecl

	if stmt.Header.is(Keywords["var"]) {
		decl, err = stmt.Header.parseVarDecl()
		if err != nil {
			return nil, &parseStmtErr{err, *stmt}
		}
	} else if stmt.Header.is(Keywords["fn"]) {
		decl, err = stmt.Header.parseFcFnDecl()
		if err != nil {
			return nil, &parseStmtErr{err, *stmt}
		}
	} else if stmt.Header.is(Keywords["property"]) {
		decl, err = stmt.Header.parsePropertyDecl()
		if err != nil {
			return nil, &parseStmtErr{err, *stmt}
		}
	} else {
		return nil, fmt.Errorf("expect 'var', 'fn', or 'property'")
	}

	if stmt.Header.ExceedEnd() {
		return &DefMemberStmt{typeConcept, varType, decl, []factStmt{}}, nil
	}

	if err := stmt.Header.testAndSkip(BuiltinSyms[":"]); err != nil {
		return nil, &parseStmtErr{err, *stmt}
	}

	facts, err := stmt.parseBodyFacts()
	if err != nil {
		return nil, &parseStmtErr{err, *stmt}
	}

	return &DefMemberStmt{typeConcept, varType, decl, *facts}, nil
}

func (stmt *TokenBlock) parseTypeMemberStmt() (*DefTypeMemberStmt, error) {
	stmt.Header.skip(Keywords["type_member"])

	typeConcepts, err := stmt.Header.parseBracketedTypeConceptPairArray()
	if err != nil {
		return nil, &parseStmtErr{err, *stmt}
	}

	if len(*typeConcepts) != 1 {
		return nil, fmt.Errorf("expect one type concept in members")
	}

	typeConcept := (*typeConcepts)[0]

	var decl fcDecl

	if stmt.Header.is(Keywords["var"]) {
		decl, err = stmt.Header.parseVarDecl()
		if err != nil {
			return nil, &parseStmtErr{err, *stmt}
		}
	} else if stmt.Header.is(Keywords["fn"]) {
		decl, err = stmt.Header.parseFcFnDecl()
		if err != nil {
			return nil, &parseStmtErr{err, *stmt}
		}
	} else if stmt.Header.is(Keywords["property"]) {
		decl, err = stmt.Header.parsePropertyDecl()
		if err != nil {
			return nil, &parseStmtErr{err, *stmt}
		}
	} else {
		return nil, fmt.Errorf("expect 'var', 'fn', or 'property'")
	}

	if stmt.Header.ExceedEnd() {
		return &DefTypeMemberStmt{typeConcept, decl, []factStmt{}}, nil
	}

	if err := stmt.Header.testAndSkip(BuiltinSyms[":"]); err != nil {
		return nil, &parseStmtErr{err, *stmt}
	}

	facts, err := stmt.parseBodyFacts()
	if err != nil {
		return nil, &parseStmtErr{err, *stmt}
	}

	return &DefTypeMemberStmt{typeConcept, decl, *facts}, nil
}

func (stmt *TokenBlock) parseRelationalFactStmt() (NotFactStmt, error) {
	fc, err := stmt.Header.ParseFcExpr()
	if err != nil {
		return nil, &parseStmtErr{err, *stmt}
	}

	opt, err := stmt.Header.next()
	if err != nil {
		return nil, &parseStmtErr{err, *stmt}
	}

	if opt == Keywords["is"] {
		return stmt.Header.parseIsExpr(fc)
	}

	if !isBuiltinRelationalOperator(opt) {
		return nil, &parseStmtErr{err, *stmt}
	}

	fc2, err := stmt.Header.ParseFcExpr()
	if err != nil {
		return nil, &parseStmtErr{err, *stmt}
	}

	vars := []Fc{fc, fc2}
	for stmt.Header.is(opt) {
		stmt.Header.skip()
		fc, err := stmt.Header.ParseFcExpr()
		if err != nil {
			return nil, &parseStmtErr{err, *stmt}
		}
		vars = append(vars, fc)
	}

	return &RelationFactStmt{true, vars, FcStr(opt)}, nil
}
