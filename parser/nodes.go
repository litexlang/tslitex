package parser

type Stmt interface {
	stmt()
}

type topStmt struct {
	stmt  Stmt
	isPub bool
}

type typeConcept string

type defVarStmt struct {
	decl  fcVarDecl
	facts []factStmt
}

func (stmt *defVarStmt) stmt() {}

type defConceptStmt struct {
	typeVar            typeVar
	conceptName        typeConcept
	inherit            []typeConcept
	typeVarMember      []fcVarDecl
	typeFnMember       []fcFnDecl
	typePropertyMember []propertyDecl
	varMember          []fcVarDecl
	fnMember           []fcFnDecl
	propertyMember     []propertyDecl
	thenFacts          []factStmt
}

func (c *defConceptStmt) stmt() {}

type defTypeStmt struct {
	typeVar        typeVar
	conceptName    typeConcept
	varMember      []fcVarDecl
	fnMember       []fcFnDecl
	propertyMember []propertyDecl
	thenFacts      []factStmt
}

func (f *defTypeStmt) stmt() {}

type fcVarDecl struct {
	varTypePairs []fcTypePair
}

type fcFnDecl struct {
	name string
	tp   fcFnType
}

type propertyDecl struct {
	name string
	tp   propertyType
}

type defPropertyStmt struct {
	decl      propertyDecl
	ifFacts   []factStmt
	thenFacts []factStmt
}

func (c *defPropertyStmt) stmt() {}

type defFnStmt struct {
	decl      fcFnDecl
	ifFacts   []factStmt
	thenFacts []factStmt
}

func (f *defFnStmt) stmt() {}

type localStmt struct {
	statements []Stmt
}

func (l *localStmt) stmt() {}

type factStmt interface {
	factStmt()
	stmt()
}

type forallStmt struct {
	typeParams []typeConceptPair
	varParams  []fcTypePair
	ifFacts    []factStmt
	thenFacts  []factStmt
}

func (l *forallStmt) factStmt() {}
func (l *forallStmt) stmt()     {}

type funcPtyStmt struct {
	isTrue bool
	fc     Fc
}

type propertyFactStmt interface {
	setT(b bool)
	factStmt()
	stmt()
	propertyFactStmt()
}

func (p *funcPtyStmt) factStmt() {}
func (p *funcPtyStmt) stmt()     {}

func (f *funcPtyStmt) setT(b bool) {
	f.isTrue = b
}
func (f *funcPtyStmt) propertyFactStmt() {
}

type typeConceptPair struct {
	Var  typeVar
	Type typeConcept
}

type typeVar string

type fcTypePair struct {
	Var  FcStr
	Type fcType
}

type fcType interface {
	fcType()
}

type fcVarType string

func (f fcVarType) fcType() {}

type fcFnType struct {
	typeParamsTypes []typeConceptPair
	varParamsTypes  []fcTypePair
	retType         fnRetType
}

func (f *fcFnType) fcType() {}

type propertyType struct {
	typeParams []typeConceptPair
	varParams  []fcTypePair
}

func (f *propertyType) fcType() {}

type fnRetType interface {
	fnRetType()
}

func (f fcVarType) fnRetType() {}
func (f *fcFnType) fnRetType() {}

type claimStmt struct {
	toCheck []factStmt
	proof   []Stmt
}

func (f *claimStmt) stmt() {}

type defAliasStmt struct {
	name     string
	variable Fc
}

func (f *defAliasStmt) stmt() {}

type knowStmt struct {
	facts []factStmt
}

func (f *knowStmt) stmt() {}

type fnRetTypeMemberDecl interface {
	fnRetTypeMemberDecl()
}

func (f *fcVarDecl) fnRetTypeMemberDecl() {}
func (f *fcFnDecl) fnRetTypeMemberDecl()  {}

type defExistStmt struct {
	decl      propertyDecl
	ifFacts   []factStmt
	member    []fnRetTypeMemberDecl
	thenFacts []factStmt
}

func (s *defExistStmt) stmt() {}

type haveStmt struct {
	propertyStmt propertyFactStmt
	member       []string
}

func (s *haveStmt) stmt() {}
