package memory

type MemFact interface {
	MemFact()
}

func (m *SpecMemFact) MemFact()   {}
func (m *ForallMemFact) MemFact() {}
