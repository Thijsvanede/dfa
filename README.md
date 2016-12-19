# Regex To DFA
This package takes a regular expression and transforms it into a deterministic finite automata (DFA).
One is able to add multiple regular expressions to the DFA with specified identifiers.
The DFA is able to check whether it accepts input and is able to return the specified identifier corresponding to that input.

## Installation
To install this module via the node package manager (npm) use the command:
```
npm install regex-to-dfa
```

## Use examples
### Loading DFA
Once the DFA is installed one can load it using:
```
var DFA = require('regex-to-dfa').DFA;
```

### Creating DFA
To create a new DFA which accepts any input corresponding to the regular expressions `foo+` and `ba*r` with identifiers `A` and `B` respectively:
```
var myDFA = new DFA(new RegExp(/foo+/), 'A');
myDFA.add(new RegExp(/ba*r/), 'B');
```

### Accepting input
To check whether input is accepted one uses
```
var isAccepted = myDFA.accepts('foo');
console.log(isAccepted);
>>> true

isAccepted = myDFA.accepts('abc');
console.log(isAccepted);
>>> false
```

To check what label corresponds to the input one uses
```
var label = myDFA.acceptingID('bar');
console.log(label);
>>> B

label = myDFA.acceptingID('abc');
console.log(label);
>>> undefined
```

## Supported expressions
 1. All character classes, e.g. `.`, `[\s\S]`, `\w`, `\W`, `\d`, `\D`, `\s`, `\S`
 2. All character sets, e.g. `[ABC]`, `[^ABC]`, `[A-Z]`
 3. All escaped characters, e.g. `\n`, `\+`, `\uFFFF`, `\xFF`, `\000`
 4. All quantifiers and alternation, e.g. `+`, `*`, `{1,3}`, `?`, `|`

## Unsupported expressions - expected in future releases
 1. Groups, e.g. `(abc)`