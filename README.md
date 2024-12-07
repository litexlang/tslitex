# LiTeX

**LiTeX** is a **formal proof management system** inspired by **Lisp semantics** and **LaTeX syntax**. Its goal is to help **ANYONE** express and verify mathematics at **ANY LEVEL** as **ELEGANTLY** and **INTUITIVELY** as if they were using natural language. LiTeX will be kept as simple as possible, so that even one man cannot write LiTeX, he can still read it.

LiTeX introduces rigorous verification into mathematical collaboration, enabling confident contributions to large-scale projects. It makes interactive textbook/paper possible and allows math researchers to focus on innovative aspects rather than mechanical verification. Details are available at [LiTeX GitHub Repository](https://github.com/litexlang/tslitex).

Feel free to share your suggestions and ideas to help me improve this open-source project—your feedback is invaluable!

---

## Setting up

1. Install Node.js and npm:

   - Download and install the latest LTS version from [nodejs.org](https://nodejs.org/)
   - Verify installation by running:
     ```bash
     node --version
     npm --version
     ```

2. Run the following commands:
   ```bash
   cd ./tslitex
   ts-node L_ReadmeExamples.ts
   ```

---

## A Tour of LiTeX

Let’s explore its syntax with examples, starting with syllogism:

### Example:

```
def mortal(something);
def something is human {if x : x is human => {x is mortal}};
let Socrates: Socrates is human;
Socrates is mortal;
if x : x is human => {x is mortal};
let god : god is not mortal;
prove_by_contradiction god is not human {
  god is mortal;
} contradiction god is mortal;
god is not human;
```

Some core functionalities of LiTeX are included in this example

- **Concept Definition**: A new concept called `mortal` takes in one parameter. Another concept called `human` has corollary that it's `mortal`.
- **Variable Definition**: Two variable, `Socrates` and `Plato`, are introduced. Socrates has property that `Socrates is human` is true.
- **Expression Validation**: The user input an expression `if x : x is human => {x is mortal};`. LiTeX interpreter checks whether given expressions are true based on facts that the user already claimed. For example, we have already known `something is human => {something is mortal};`, so `x is mortal` is true under assumption `x is human`.
- **Proof**: in LiTeX, there are 2 ways of proving a result: prove or prove_by_contradiction.
- **Expression Values**: After checking, there are 4 types of outcomes: true, unknown, error, false.

---

### Expression Values

- **True**: The current expression is validated as true by the LiTeX interpreter.
- **Unknown**: The interpreter cannot verify the expression using known facts.
- **Error**: Indicates syntax or semantic errors.
- **False**: The negation of the current expression is validated as true.

## Syntax

# Logical Concept System Examples

## Concept Definition

```
def p(x);
def x is p1;
def q(x,y);
def p2(x) {if x: x is p1 => {x is p2} }
def p3(x) {if x: p3(x) => {p(x)} , if x: p(x) => {p3(x)} }
let x,y: p3(x), p(y);
p(x), p3(y);
def p(x); // error: you can not declare a concept twice.
```

## Expression Checking

```
def human(x);
def teacher(x,y);
let 亚里士多德, Plato: 亚里士多德  is human;
亚里士多德 is not human; // False
human(亚里士多德);
Plato, 亚里士多德 are human;
teacher(Plato, 亚里士多德);
know teacher(Plato, 亚里士多德);
teacher(Plato, 亚里士多德);
let somebody;
somebody is human; // Unknown
```

## Variable Introduction

```
def p(x); def q(x,y);
let x,y,z;
let 变量, 10.2, _nonsense, 你好 world, I-AM-MEANINGLESS;
let a,b,c: a is p, q(b,c);
let y; // y already declared.
```

## Not Operator

```
def p(x);
let v1, v2, v3, v4, v5: not p(v1), v2 is not p, not v3 is p, v4,v5 are not p;
not p(v1);
let v6;
not p(v6); // Unknown
know not p(v6);
not p(v6); // True
```

## If and Forall

```
def p1(x); def p(x); def p2(x) {if x: x is p2 => {x is p1}}
if x: x is p2 => {x is p1}; // True
if x: x is p => {x is p1}; // Unknown
if x : x is p => {x is p}; // Always true
```

## Prove and Contradiction

```
def p3(x); def p2(x); def p1(x);
know if x: p3(x) => {p2(x)}, if x : p2(x) => {p1(x)} ;
prove if x : x is p3 => {x is p1} {x is p2;}
let v10,v12: v10 is p2; // prove factual-expression {proofs}
prove v10 is p1 {v10 is p2;}
know v12 is not p1;
prove_by_contradiction v12 is not p3 {v12 is p2;} contradiction v12 is p1;
```

## Exist

```
def p(x); def q(x); def t(x,y); def t_y(x); know if x :t(x,y) => {t_y(x)};
let x, y: t(x,y);
t_y(x);
exist(t_y)[x];
know if exist(t_y) => {q(y)};
q(y);
```

## Know Not Exist

```
def p(x); def q(x);
know not exist(p);
exist(p);
not exist(p);
if x: => {not p(x)};
```

## Prove Exist

```
def p(x); prove exist(p) {let x: p(x); exist(p)[x];}
```

## Know Exist

```
def p(x); def q(x); def t(x,y); def t_y(x); know if x :t(x,y) => {t_y(x)};
know exist(p);
exist(p);
```

## Have

```
def p(x); know exist(p); have x: p(x);
```

## Parameter Passing with Subset Demonstration

```
def set(x); def subset(A,B); def in(x,A);

# Subset definition: if x is in A, then x must be in B
know if A,B: subset(A,B) => {if x: in(x,A) => {in(x,B)}};

# Alternative subset definition
know if A,B: if x: in(x,A) => {in(x,B)} => {subset(A,B)};

# Example usage
let A,B,C,D,E,F;
know subset(A,B);
let x: in(x,A);
in(x,B)[A,B;x];  # Proof of membership
```

## Transitivity Demonstration

```
# Define a less-than relation with transitivity
def <(x,y);
know if x,y,z: <(x,y), <(y,z) => {<(x,z)};

# Example of transitive property
let a,b,c: <(a,b), <(b,c);
<(a,c)[a,b,c];  # Proving transitivity
```

## Macro: Binding Properties to Literals

```
# Define a natural number predicate
def natural(x);

# Macro to automatically recognize natural number literals
macro "^(0|[1-9]d*)$" v natural(v);

# Example usage
let 2;
natural(2);  # Automatically verified
```

## Continuity Checking

```
# Define predicates for continuity
def point_wise_continuous(f,x);
def continuous(f);
def in_domain(x);

# Establish continuity condition
know if f: if x : in_domain(x) => {point_wise_continuous(f,x)} => {continuous(f)};

# Example usage
let f;
know if x : in_domain(x) => {point_wise_continuous(f,x)};
continuous(f);  # Inferred from previous conditions
```

## Named Known Checks and Proof Mechanisms

```
# Define predicates
def p(x); def q(x); def t(x);

# Named known checks with proof by reference
let a: p(a);
know [_1] if x: p(x) => {q(x)};
by _1(a);
q(a);  # Proven

# Conditional existence proof
let [_2] b: if x : x is p => {t(b)};
by _2(a);
t(b);  # Proven conditionally
```

## Advanced If-Then Logical Checking

```
# Define predicates
def p(x); def q(x); def t(x,y);

# Multiple ways of expressing logical implications
know if x,y: t(x,y) => {q(x)};
if x,y: t(x,y) => {q(x)};
know if x,y: t(x,y) => {q(x)};

# Nested implication checking
if : => {if x,y: t(x,y) => {q(x)}};
```

## Potential of LiTeX

### Advancing Collaborative Mathematics

LiTeX introduces rigorous verification into mathematical collaboration, enabling confident contributions to large-scale projects. Like distributed version control in software, its verification engine ensures correctness and facilitates trust across the mathematical community.

### Enhanced Verification Workflow

By automating logical inconsistency detection, LiTeX reduces verification overhead in mathematical research. Researchers and reviewers can focus on innovative aspects rather than mechanical verification, maintaining rigor while accelerating review.

### Accessible Formal Mathematics

Through its carefully designed specification language, LiTeX bridges intuitive mathematical thinking and formal verification. The natural syntax maintains precision while remaining accessible to both researchers and students, promoting broader adoption of formal methods.

### Educational Integration

LiTeX serves as an advanced educational tool offering:

- Interactive math textbook: Theorem, Concept dependency visualization
- Flexible proof granularity at multiple levels
- Clear exposition of mathematical relationships
- Systematic mathematical intuition building

### Universal Verification Framework

LiTeX's methodology extends beyond mathematics to any domain with formal verification requirements:

- Software verification and validation
- Protocol correctness proofs
- Hardware design verification
- Formal specification validation
- Business rule consistency checking
- System architecture verification

### Mathematical Knowledge Base Development and AI Integration

The platform advances artificial intelligence systems through:

1. **Structured Knowledge Base**

   - Formally verified mathematical content
   - Hierarchical theorem relationships
   - Explicit proof strategies and patterns
   - Standardized verification procedures

2. **AI Training Enhancement**

   - High-quality, verified training datasets
   - Precise reasoning patterns and workflows
   - Structured logical dependencies
   - Mathematical reasoning templates
   - Custom verification rule sets
   - Automated consistency checking
   - Scalable verification frameworks

3. **Model Improvement Framework**
   - Systematic error detection
   - Reasoning path validation
   - Logical consistency enforcement
   - Performance benchmarking
   - Verification-guided training

LiTeX integrates verification with collaboration to create a robust platform for mathematics education and research, promoting both rigor and broad participation in mathematical advancement.

```

```
