# Litex: The Minimalist Proof Assistant

- [Litex: The Minimalist Proof Assistant](#litex-the-minimalist-proof-assistant)
  - [About](#about)
  - [Design principles of Litex](#design-principles-of-litex)
    - [Similarities between math and programming](#similarities-between-math-and-programming)
    - [Differences between math and programming](#differences-between-math-and-programming)
  - [Syntax and Semantics](#syntax-and-semantics)
      - [A Tour of Syntax and Semantics of Litex](#a-tour-of-syntax-and-semantics-of-litex)
    - [Why another formal language? Litex is special for its simplicity and intuitive syntax.](#why-another-formal-language-litex-is-special-for-its-simplicity-and-intuitive-syntax)
    - [Litex has its root in existing programming languages.](#litex-has-its-root-in-existing-programming-languages)
  - [Impact of AI for Math with Litex](#impact-of-ai-for-math-with-litex)
  - [What's to be expected.](#whats-to-be-expected)
  - [What is to be done](#what-is-to-be-done)
  - [Join the Litex Project](#join-the-litex-project)
  - [Appendix](#appendix)


## About

_That language is an instrument of human reason, and not merely a medium for the expression of thought._

_–- George Boole_

**LiTeX is a formal proof verification system designed for everyone. It seeks to manage the increasing level of abstraction and complexity in mathematics and help everyone, ranging from mathematicians, AI experts to high-school students, benefit from automated verification.**

**Since even children can express mathematics naturally, there must exist a design for a formal language that allows anyone to quickly understand and use it. The goal of Litex is to invent such a language. The implementation approach leverages a profound understanding of the commonalities and distinctions between formal languages and mathematics.** 

**Litex is designed to be as simple and intuitive as Python or LaTeX, with a minimal learning curve. Users can rely on common sense rather than complex theories like type theory to write Litex, making mathematical rigor and reliability accessible to everyone.**

## Design principles of Litex

_Theory and practice sometimes clash. And when that happens, theory loses. Every single time._

_-- Linus Torvalds_

Litex is the bridge between the programming world and math world. It adopts a minimalism approach in language design so that the complexity of writing mathematics does not exceed that of mathematical reasoning itself, allowing users to focus without being distracted by limitations imposed by tradition formal languages.

The reason Litex can achieve a uniform language with such concise syntax and semantics to express the complex world of mathematics is that it clearly recognizes both the differences and commonalities between mathematics and programming.We start by investigating **similarities and differences between math and programming**.

### Similarities between math and programming

_Mathematics... is nothing more than a game played according to certain simple rules with meaningless marks on a paper._

_-- David Hilbert_

Mathematics and programming are very similar in terms of **core principles** and the **workflow practices** of practitioners.

1. **The basic elements are symbols. Symbols have properties. In most cases, properties define relationships with other symbols.**
   Note that certain operations can only be applied to elements with specific properties. For example, '/' can only be used with 'invertible symbols'.  

2. **Both math and programming follow small, universally understood rule sets. However, when symbols combine, they create new symbols and rules, leading to complexity (similarly, combining procedures creates new procedures).**
   Operator overloading is everywhere in math. For instance, '+' can mean adding numbers, combining vectors, or uniting sets. Litex embraces this flexibility, allowing operators to adapt to specific needs while maintaining clarity and intuition.  

3. **Both programming and mathematics share a deeply interconnected workflow, blending creativity, precision, and collaboration.**
    For example, programmers run code to test and debug, ensuring it works as intended. Similarly, mathematicians "compile" proofs step by step in their minds, "debugging" potential errors in their logic. With Litex, the "debugging" process here can be automated.

4. **In Litex, each object has a type and a value. The type defines the operations that can be applied to the value and the members the value has. Some types also have related "type_members," similar to how `static` works in C++ classes.  Like in many programming languages, you can use the dot `.` operator to access members of an object**

5. **Fundamentally, computer science is the science of abstraction, and math is the study of abstract structures and relationships.**  
   At their core, programming and mathematical problem-solving address similar problems. Programming has developed robust frameworks like object-oriented programming, modular design, and reusable libraries to manage complexity caused by abstraction. By adopting these principles, mathematics can streamline its processes, making abstract concepts more accessible and easier to handle.


### Differences between math and programming

_The computer revolution is a revolution in the way we think and in the way we express what we think. The essence of this change is the emergence of what might best be called procedural epistemology­ the study of the structure of knowledge from an imperative point of view, as opposed to the more declarative point of view taken by classical mathematical subjects. Mathematics provides a framework for dealing precisely with notions of "what is." Computation provides a framework for dealing precisely with notions of "how to."_

_-- Structure and Interpretation of Computer Programs_

**LiTeX thrives in the intersection of mathematics and programming, leveraging their common ground to enable formal verification. However, what truly sets LiTeX apart is its focus on the subtle differences between the two fields. While the shared foundation allows for formal proving, it is LiTeX's attention to these distinctions that makes it unique compared to previous formal languages.**

1. **Litex is a verifier. It is a domain-specific language rather than a general-purpose language.**

**LiTeX is designed to closely align with the field of mathematics. Each LiTeX expression only returns `true`, `false`, `unknown`, or `error`. Execution in LiTeX is about validating formalized reasoning, rather than performing arbitrary calculations or controlling the flow of operations.**

**For instance, no one would manually iterate 10,000 times to construct a proof. Instead, such iteration is encapsulated as a single formal step using keyword `forall`. This is how people typically work in mathematics, and it's also how LiTeX operates.**

**This makes LiTeX a domain - specific language tailored for verification, unlike general-purpose programming languages such as Lean4 or Coq. Previous formal languages, while better at formalizing proofs than mainstream languages like C or Python, are still general-purpose. This forces them to handle both execution/control-flow and verification, making their syntax cumbersome. LiTeX, free from the burden of execution, operates more like a regex matcher or SQL query processor, validating structured statements against formal rules. Adding unnecessary features would only weaken its expressive power. Execution in LiTeX is possible but is handled through plugins, not the language itself.**

1. **Function as symbol combination, not an algorithm for future execution**

**Also, functions in Litex don’t "execute" in the traditional sense; instead, they serve as tools to combine predefined symbols and relationships.** After all, many mathematical expressions are written using free variables like *a* and *b*, which inherently lack fixed values. Even when using fixed variables, many integrals or expressions cannot be strictly computed to exact values. This aligns with Litex's purpose: it focuses on verifying the logical structure rather than performing computations.

3. **No control program flow**  

In math, constructs like while loops or switch statements—used to control program flow are unnecessary (Mathematical induction and similar methods can handle iterative cases without using actual iteration.). Mathematical reasoning focuses on deriving truths from existing facts, not on directing execution paths. This is why Litex avoids such features, treating them as plugins instead of core functionalities.

4. **Math as Structured String Transformation**

Math often resembles "transforming strings that match specific structures (like regular expressions)." Symbols that meet certain conditions can be combined with other qualified symbols in permitted ways. The three fundamental elements—functions, arguments, and propositions—can all be represented as symbols, enabling a unified and structured approach to mathematical reasoning.

5. **Existence of variables**

In programming, we can create as many variables as we want with no restriction. Meanwhile, in math, we must prove their existence first. Sure, We can definitely create an integer called x because there certainly exist many integers. However, existence of many other variables are extremely difficult to test.

In Litex, existence is a special kind of proposition. The only differences is that users can "call" a existence-proposition and introduce new variables. Read user manual for more details.

4. **What does "call a function" mean?**
In programming, people encapsulate a piece of logic into a function and use it by passing variables and calling its name. In Litex, there is nothing about "function execution" because function name in math is nothing by a symbols that binds different other symbols together. The only difference between symbols that represent variables and functions is that symbols representing functions are written before () and other symbols are written inside (). However, execution do happen when the user call a proposition. For example, when the user inputs "Socrates is human", the interpreter searches all existing specific and forall facts related to human and watches if Socrates is human can be derived.

5. **Nothing is behind the scenes**
In mathematical verification, every step of the verification process is explicitly written. What you write is exactly, not more, not less, than what you have written. In programming, you might write while loops, and may thousands of steps of execution is "represented" by this while loop. Or you might write if-else, and when in actual execution, only some branch is visited. That is why there is no "debugging" in Litex. If you write a statement that does not return `true`, the interpreter will immediately stop the process at that line. No further errors will happen behind the scenes.

6. **The interpreter tells the user how a statement is verified, which makes interactive math textbook possible.**
The Litex interpreter follows strict rules to check the validity of a statement. If the statement is indeed `true`, the interpreter will tell the user how previous `true` statements leads to the correctness of the statement. Just like programmers rely on intellisense to program, soon everyone can take advantage of that functionality to interact with the Litex code and understand math better.

7. **Different meanings of symbols**
In math, = means equal, which is represented by "==" in programming languages like Python. It works along with < > <= >= as a proposition. In programming, = means "variable initialization". Litex does not require every variable to be initialized because some properties does not rely on initialization.

## Syntax and Semantics

_Beautiful is better than ugly._

_Explicit is better than implicit._

_Simple is better than complex._

_-- The Zen of Python_

The design of Litex is inspired mainly by designs of existing programming languages like Python, GoLang, C, C++, Rust, JavaScript/TypeScript, Lisp, LaTeX instead of mathematical logic. Unlike other formal languages, Litex uses programming thinking to understand mathematical proofs, not the other way around.

#### A Tour of Syntax and Semantics of Litex

_Simplify, simplify, simplify._

_--Steve Jobs_

The same idea, expressed in different ways, can feel entirely distinct. As a result, the syntax of different programming languages encourages vastly different coding styles. **Litex must strike a balance between simplicity, intuitiveness, mathematical alignment, and programming conventions.** Intuition behind this design is more like art -— difficult to explain in words, yet its impact is the most profound.

Below are the core principles of syntax design. **The specific syntax may change, but these fundamental design principles will remain unchanged.**

1. The basic elements of math -— variables, functions, and propositions —- are all represented as symbols. Main statements are limited to defining variables, functions, propositions, types, and concepts; stating facts; making claims and proofs; and accessing knowledge. Basic components of Litex are simple and easy to combine, favoring composability over monolithic design.

2. In Litex, a mathematical set is equivalent to a type. Types define members, including methods, propositions, and operator overloads, which is where object-oriented principles (OOP) are applied. For example, every time you encounter expression "x of y", it means you should give a member to y called x.

3. A class of sets is represented as a *concept*.  

4. Facts: `forall` introduces new variables, `if` introduces conditions, and basic propositions are treated like functions that return boolean values.  

5. Every expression returns one of four values: `True`, `Unknown`, `False`, or `Error`.  

6. Symbols can be combined into new symbols using operators (functions). Functions in Litex don’t execute; they simply combine previously defined symbols.  

7. Propositions combined with other propositions create new propositions.  

8. Propositions are named *facts*, but unnamed facts also exist.  

9. `Exist` is a special proposition and should be referenced like normal propositions.  

10. When a user inputs a fact, the interpreter verifies it. If true, it’s stored for future use; otherwise, nothing happens.  

11. `Forall` facts can be "called" to verify an input fact without naming it.  

12. The `=` operation is special and can be validated in two ways: symbolically (same function and parameters) or through verification by other facts.  

13. The standard library includes packages for natural numbers and sets.  

14. Logical operators include `not`, `or`, and `and`. `Not-and` is equivalent to `or-not`, making `or` syntactic sugar. `Exist` is equivalent to `not forall`, but Litex enforces `exist` for uniformity, disallowing `not forall`.

15. A symbol may have many types, but it's its main type that tells the Litex interpreter what functions or propositions can "call" it. It works in the same way how the Macintosh works: you can open many windows at the same time, but there is only one main window that you are working on.

16. In traditional formal languages, naming each fact is intended to allow quick reference in the future. However, for mathematical proofs, such low-level operations should be abstracted away, much like how modern programming languages handle memory management automatically. In the past, programmers had to manually find available memory addresses to allocate (as in assembly) or manage memory allocation and deallocation themselves (as in C). Similarly, when you declare a fact, **the system should automatically locate(search) the relevant facts that can derive it (or throw an "unknown" error if none are found). This "search" can happen in two ways: 1. If an identical fact (as a string) is stored, it is validated; 2. If a universal fact (e.g., a "forall" statement) is stored, and the parameters match the requirements of the universal statement, it is validated.** If there does exist a fact that verifies your claim, then the output is `True`, if not the output is `Unknown`. This approach streamlines the process, allowing mathematicians to focus on higher-level reasoning rather than manual fact management.

### Why another formal language? Litex is special for its simplicity and intuitive syntax.

_Common sense is not so common._

_--Voltaire_

A good tool promotes good practices by ensuring clarity through consistency, simplicity, and intentional design. Clarity is essential; without it, your work will go unnoticed.

Traditional formal languages link programming to math but are often criticized for being unclear, as they prioritize explaining mathematical theories over practical use. **Previous formal languages are too complex, making it hard for users to write good proofs without clear understanding, limiting their adoption.**

**A key insight supporting Litex's minimalism is that verification logic across mathematical disciplines differs little. Surface-level variations stem from abstraction and writing conventions, not fundamental logic.**

**Newton didn’t need type theory for calculus, and children don’t need the Curry-Howard Isomorphism to start math. People naturally grasp math intuitively. Thus, a formal language should be accessible to all, not just experts. Litex is built on common sense, emphasizing the subtle connections between math and programming.**

**Litex adheres to minimalism—every keyword or syntax excels at one task, ensuring consistency. It’s a complete system, with no missing or redundant features, preventing convoluted logic and vague expressions. Users can rely on intuition, making reading and writing Litex a pleasure.**

### Litex has its root in existing programming languages.

_If I have seen further, it is by standing on the shoulders of giants._

_-- Isaac Newton_

Litex is designed to be an everyday tool, which is why its learning curve should be as gentle as possible for newcomers. People find it easier to learn concepts similar to what they already know, which is why Litex incorporates many great ideas from mainstream programming languages. In fact, the name "Litex" is derived from Lisp + TeX, as Litex is heavily inspired by both of them. Here are some examples:

1. Python's scoping rules and its "less typing" philosophy.  
2. Go's type syntax and "simplicity is complicated" design.
3. Concepts inspired by C++ Concepts, Python Protocols, Go Generics, and Rust Generics.  
4. TeX-like separation of logical expressions (plain text) and mathematical expressions.  
5. Everything is a symbol, and everything (variables, functions, properties) is a first-class citizen, inspired by Lisp and its descendants. Everything in lisp is nothing but symbol and list. Newcomers can learn Lisp in less than 5 minutes. Notice how the success of Lisp teaches us "Complex structure stem from well-organized simple elements."
6. Introducing OOP to math, with OOP built on interfaces rather than inheritance. This saves user from relying on layers of layers of imported "basic types". For example,you can define division without defining an ordered field, since humans invented division before defining ordered fields. This greatly simplifies the program, allowing users to solve problems starting from the abstract layer they're interested in, without having to worry about the underlying details. 
7. A package system inspired by Go that helps programmers collaborate, maintain their proofs, and easily import others' results.


## Impact of AI for Math with Litex  

_We must know. We will know.._

_--David Hilbert_

**Litex's simplicity and clarity make it ideal for AI-driven mathematics. Its clean syntax minimizes ambiguity when converting natural language into formal proofs, making the process as straightforward as translating pseudocode into Python while preserving mathematical rigor. This automation is key to scaling up mathematical pipelines, enabling the translation of vast numbers of math textbooks and papers into formal languages, which enriches datasets and supports large-scale automation.**

**In training, Litex automates formal language verification for RL(Reinforcement Learning) reward functions, eliminating the need for human supervision and ensuring scalability. It serves as a cross-model framework, standardizing RL pipelines and reward functions across models like DeepSeek-r1, AlphaProof, and AlphaGeometry. By leveraging Litex, LLMs excel at reasoning tasks, enabling much more scalable and precise training for complex models.**

**With access to extensive high-quality datasets and Litex's expressive power, AI systems will gain unprecedented capabilities in exploring advanced theorems. This creates a feedback loop where machines autonomously propose and refine proofs, pushing the boundaries of mathematical reasoning into uncharted territories.**


## What's to be expected.

_We shape our tools, and thereafter our tools shape us._

_-- Marshall McLuhan_

The computer revolution is the revolution of automation. People do not need to pay attention to repetitive parts of their work and only focus on the creative part. The ultimate potential of Litex is to revolutionize the math community by transitioning from traditional paper-pencil methods to computer programming, empower them with automatic verification. Individuals no longer have to worry about hard-to-detect, potentially fatal proof errors that can undermine their work. Huge efforts can be saved by just adopting Litex. 

When studying a new area, the most overwhelming part is often learning its conventions—symbols, basic theorems, and concepts. Authors may assume you know these, but gaps can make proofs hard to follow. **With Litex, relationships between symbols can be visualized or guided by the IDE, allowing you to easily jump to definitions. The Litex Interpreter verifies each step, helping you stay on track even with unfamiliar proofs. This showcases the potential of "math in the digital age.".**

This shift eliminates paper review time, as Litex can verify the correctness of proofs. With the integration of automated verification tools and collaborative platforms, any error can be identified and corrected early in the process. 

Global collaboration can be expected on an unprecedented scale, fostering trust among mathematicians worldwide (again, as Litex verifies the proofs). That's why I am looking for a Github for mathematicians.

**Due to the similarities between programming and mathematics, the mathematical community may follow the programming world's path, shifting from paper-and-pencil work to automated, collaborative processes. This could transform mathematical discovery, making it more dynamic, transparent, and accessible.**

Litex is a daily tool designed for every mathematics users, not just for experts.That's why it is both human-readable and machine-efficient. More users mean a better Litex. Previous formal languages failed to bring true transformation because of their complexity, but Litex, being simple enough, can have a deeper impact on the mathematical community. 

## What is to be done

_A journey of a thousand miles begins with a single step._

_--Chinese Proverb_

Litex is solving a problem that nobody has ever solved or even imagined. Small, occasional pitfalls are to be expected.

Litex itself is far from perfect. Its current syntax may not yet be comprehensive enough to express all mathematical concepts seamlessly. Additionally, as Litex adoption grows and more users contribute to large-scale projects, there is a risk of inconsistencies in the codebase. 

The Standard Library (STL) is essential because it handles many "small" facts that are intuitive for humans but require extra effort to implement. It is under development, and it needs help from the community. These pre-built components improve user experience by simplifying common tasks. If the STL doesn't cover a specific fact you need, use the **"know" keyword** to skip it for future implementation or assume it by default, allowing you to focus on higher-level logic without getting stuck on details.

Addressing these challenges will require ongoing collaboration between the user and developer communities, ensuring that Litex evolves to meet the diverse needs of mathematicians while maintaining clarity, modularity, and extensibility. 


## Join the Litex Project

_The best way to predict the future is to invent it._

_-- Alan Kay_

The inventor of Litex, Jiachen Shen, is a hacker with a math degree. The Litex project is starred by enthusiasts from world-class institutions, including The University of Chicago, Carnegie Mellon University, Fudan University, Shanghai Jiao Tong University, openMMLab, deepmath.cn etc.

I do this for fun. I have strong belief that there is only a small gap between programming and mathematical reasoning. The more I program this project, the firmer my belief becomes. I also believe that both the AI community and the math community will benefit from Litex.

If you want to contribute to Litex, you must be able to appreciate its simplicity. Litex is a very small language. After all, as the only contributor to Litex (at least the first 1500 git commits are all pushed by me), I have no time to implement a complicated one. However, such severe restriction on time and budget forces me to go back to common sense, polish my ideas again and again until Litex is as simple as possible. That is where the clean syntax comes from: belief in minimalism, high focus, full passion.

Since Litex is still under development, it's inevitable that today's Litex might be very different than what it is in the future. That's why Litex will never be a success without its users and contributors. Feel free to issue your suggestions and ideas to help me improve this open-source project—your feedback is invaluable.

Visit [the Litex website](https://litexlang.org) for more information. Contact me by litexlang@outlook.com, malloc_realloc_free@outlook.com.

## Appendix

The Litex logo (generated by a piece of recursive Python code) is a binary tree for several symbolic reasons: 1) As as data structure, binary trees are a perfect demonstration of how abstraction is handled, and the concept abstraction plays a fundamental role in both mathematics and programming.  2) As a procedural diagram, it illustrates how facts generate new facts, with each validation relying on an interconnected network -— mirroring mathematical discovery and how procedures call one another in a computer program. 
