package main

import "fmt"

type Greeter struct {
	name string
}

func (g *Greeter) Hello() string {
	return "Hello, " + g.name
}

func (g Greeter) Bye() string {
	return "Bye, " + g.name
}

func NewGreeter(name string) *Greeter {
	return &Greeter{name: name}
}

func main() {
	fmt.Println(NewGreeter("world").Hello())
}
