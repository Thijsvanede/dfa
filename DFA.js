/**************************************************/
/**                   Imports                    **/
/**************************************************/
var State = require('./State.js').State;

/**************************************************/
/**                 Constructor                  **/
/**************************************************/
/**
 * Creates DFA from regex and possible initial state.
 */
var DFA = function(regex, identifier, initial){
    this.ID = 0;
    this.initial = this.scan(regex, identifier, initial);
};

/**************************************************/
/**                 Constants                    **/
/**************************************************/
var ESCAPED     = 'ESCAPED';
var REGULAR     = 'REGULAR';
var SET         = 'SET';
var PLUS        = 'PLUS';
var STAR        = 'STAR';
var QUANTIFIER  = 'QUANTIFIER';
var OPTIONAL    = 'OPTIONAL';
var ALTERNATION = 'ALTERNATION';
var GROUP       = 'GROUP';

/**************************************************/
/**                 Functions                    **/
/**************************************************/
/**
 * Method to retrieve the number of nodes in the DFA.
 */
DFA.prototype.size = function(){
    return this.ID;
};

/**
 * Method stating whether given input yields accepting state.
 */
DFA.prototype.accepts = function(transitions){
    var currentState = this.initial;
    for(var transition in transitions){
        if (currentState === undefined)
            break;
        currentState = currentState.getNext(transitions[transition]);
    }
    if(currentState === undefined)
        return false;
    else{
        return currentState.isAccepting();
    }
};

/**
 * Method returning the identifier of accepting state
 * or undefined if no accepting state wasfound.
 */
DFA.prototype.acceptingID = function(transitions){
    var currentState = this.initial;
    for(var transition in transitions){
        if (currentState === undefined)
            break;
        currentState = currentState.getNext(transitions[transition]);
    }
    if(currentState === undefined)
        return undefined;
    else{
        return currentState.getIdentifier();
    }
};

/**
 * Method to add additional regex to DFA.
 */
DFA.prototype.add = function(regex, identifier){
    this.initial = this.scan(regex, identifier, this.initial);
    return this;
};

/**
 * Method to create DFA initial state from regex
 * and possible existing initial state.
 */
DFA.prototype.scan = function(regex, identifier, initial){
    return this.__createDFA__(
           /** Set final booleans **/
           __setFinal__(
           /** Handle or instances **/
           __handleOr__(
           /** Combine quantifiers with their expression **/
           __combineQuantifiers__(
           /** First tokenise regular expression **/
           __tokenise__(regex)))), initial, identifier);
};

/**************************************************/
/**      Private Functions - Construct DFA       **/
/**************************************************/
/**
 * Method to create DFA from the mess that was made from all previous methods.
 * Reference:
 * Token            = [0]
 * Type             = [1]
 * Quantifier       = [2]
 * Quantifier Type  = [3]
 * Final            = [4]
 */
DFA.prototype.__createDFA__ = function(tokens, initial, identifier){
    var entry = null;
    
    if(initial === undefined)
        initial = new State(this.getID(), false);
        
    var current = undefined;
    
    /** Loop over traces in tokens **/
    for(var trace of tokens){
        /** Reset current state to initial state for new trace. **/
        current = initial;
        
        for(var index = 0; index < trace.length; index++){
            entry = trace[index];
            
            switch(entry[1]){
                
                /** Handle group TODO**/
                case GROUP:
                    switch(entry[3]){
                        
                        /** Handle PLUS **/
                        case PLUS:
                            //TODO
                            throw 'GROUPs with PLUS quantifier are currently not supported.';
                        
                        /** Handle STAR **/
                        case STAR:
                            //TODO
                            throw 'GROUPs with STAR quantifier are currently not supported.';
                            
                        /** Handle QUANTIFIER **/
                        case QUANTIFIER:
                            //TODO
                            throw 'GROUPs with QUANTIFIER quantifier are currently not supported.';
                            
                        /** Handle OPTIONAL **/
                        case OPTIONAL:
                            //TODO
                            throw 'GROUPs with OPTIONAL quantifier are currently not supported.';
                        
                        /** Method for handeling regular groups, i.e. without quantifiers. **/    
                        default:
                            //TODO
                            throw 'GROUPs are currently not supported.';
                    }
                
                /** Handle single case **/
                default:
                    switch(entry[3]){
                        
                        /** Handle PLUS **/
                        case PLUS:
                            current = this.__addPlus__(current, entry, identifier);
                            break;
                            
                        /** Handle STAR **/
                        case STAR:
                            current = this.__addStar__(current, entry, identifier);
                            break;
                         
                        /** Handle QUANTIFIER **/   
                        case QUANTIFIER:
                            current = this.__addQuantifier__(current, entry[2], trace, index, identifier);
                            return initial;
                        
                        /** Handle OPTIONAL **/    
                        case OPTIONAL:
                            current = this.__addOptional__(current, trace, index, identifier);
                            return initial;
                        
                        /** Method for handling regular chars, i.e. without quantifiers. **/
                        default:
                            current = this.__addRegular__(current, entry, identifier);
                    }
            }
        }
    }
    return initial;
};

/**
 * Method to add QUANTIFIER quantified char to DFA
 */
DFA.prototype.__addQuantifier__ = function(current, quantifier, trace, index, identifier){
    /** Retrieve minimum and maximum quantifier from quantifier. **/
    var min = __quantifierParameters__(quantifier);
    var max = min[1];
        min = min[0];
        
    /** Initialise remaining trace to everything after current index. **/
    var remainingTrace = trace.splice(index+1, trace.length);
    
    if(min === 0)
        current = this.__createDFA__([remainingTrace], current, identifier);
    
    /** Add character of current index 'min' times to current state. **/
    for(var i = 0; i < min-1; i++){
        current = this.__addRegular__(current, trace[index], identifier);
    }
    
    /** Add character and remaining trace 'max'-'min' times to current state. **/
    for(i; i < max; i++){
        current = this.__addRegular__(current, trace[index], identifier);
        current = this.__createDFA__([remainingTrace], current, identifier);
    }
    
    /** Return current state. **/
    return current;
};

/**
 * Method to add OPTIONAL quantified char to DFA
 */
DFA.prototype.__addOptional__ = function(current, trace, index, identifier){
    return this.__addQuantifier__(current, '{0,1}', trace, index, identifier);
};

/**
 * Method to add STAR quantified char to DFA
 */
DFA.prototype.__addStar__ = function(current, entry, identifier){
    if(entry[4])
        current.accepting = entry[4];
    else
        identifier = undefined;
    return current.addNext(new RegExp(entry[0]), current, identifier);
};

/**
 * Method to add PLUS quantified char to DFA
 */
DFA.prototype.__addPlus__ = function(current, entry, identifier){
    var next = new State(this.getID(), entry[4]);
    next = current.addNext(new RegExp(entry[0]), next, identifier);
    return next.addNext(new RegExp(entry[0]), next);
};

/**
 * Method to add regular char to DFA,
 * i.e. no quantifier.
 */
DFA.prototype.__addRegular__ = function(current, entry, identifier){
    var next = new State(this.getID(), entry[4]);
    return current.addNext(new RegExp(entry[0]), next, identifier);
};

/**
 * Method to retrieve current ID and increment it.
 */
DFA.prototype.getID = function(){
    this.ID++;
    return this.ID-1;
};

/**************************************************/
/**   Private Functions - quantifier params      **/
/**************************************************/
/**
 * Method to get minimum and maximum parameters from quantifier
 */
var __quantifierParameters__ = function(quantifier){
    var res = quantifier
              .substring(1, quantifier.length-1)
              .split(',')
              .map(function(elem){return parseInt(elem, 10)})
              .sort();
              
    if(res.length === 1)
        res[1] = res[0];
    return res;
};

/**************************************************/
/**        Private Functions - Set Final         **/
/**************************************************/
/**
 * Method to set final boolean
 */
var __setFinal__ = function(tokens, final){
    switch(final){
        
        /** If no final argument is given we assume there can still exist a final. **/
        case undefined:
            final = true;
        
        /** Case where final is true, i.e. still possible for a final to occur. **/
        case true:
            for(var path of tokens){
                final = true;
                for(var i = path.length-1; i >= 0; i--){
                    path[i] = [path[i][0], path[i][1], path[i][2], path[i][3], final];
                    
                    /** If group found **/
                    if(path[i][0] instanceof Array)
                        path[i][0] = __setFinal__(path[i][0], final);
                    
                    if(__isFinalQuantifier__(path[i][3])){
                        final = false;
                    }
                }
            } 
            break;
        
        /** Case where final is false, i.e. not possible for a final to occur. **/
        default:
            for(path of tokens){
                for(i = 0; i < path.length; i++){
                    path[i] = [path[i][0], path[i][1], path[i][2], path[i][3], false];
                    
                    /** If group found **/
                    if(path[i][0] instanceof Array)
                        path[i][0] = __setFinal__(path[i][0], false);
                }
            }
    }
    
    return tokens;
};

/**
 * Method returning whether quantifier is final.
 */
var __isFinalQuantifier__ = function(quantifier){
    return quantifier === undefined || quantifier === PLUS || quantifier === QUANTIFIER;
};

/**************************************************/
/**       Private Functions - Or instances       **/
/**************************************************/
/**
 * Method to handle or instances.
 */
var __handleOr__ = function(tokens){
    var result = [];
    var current = [];
    
    for(var token of tokens){
        switch(token[1]){
            
            /** Group found **/
            case GROUP:
                current.push([__handleOr__(token[0]), token[1], token[2], token[3]]);
                break;
            
            /** Or found **/
            case ALTERNATION:
                result.push(current);
                current = [];
                break;
                
            /** Regular case **/
            default:
                current.push(token);
        }
    }
    
    result.push(current);
    return result;
};

/**************************************************/
/**   Private Functions - Combine Quantifiers    **/
/**************************************************/
/**
 * Method to combine quantifiers with their token.
 * Creates a tuple [token, type, quantifier, quantifierType]
 * Reference:
 * Token            = [0]
 * Type             = [1]
 * Quantifier       = [2]
 * Quantifier Type  = [3]
 * Note that quantifiers are: PLUS, STAR, QUANTIFIER, and OPTIONAL.
 */
var __combineQuantifiers__ = function(tokens){
    var result = [];
    
    var types = tokens[1];
        tokens = tokens[0];
    
    for(var i = 0; i < tokens.length; i++){
        switch(true){
            /** Case of group and quantifier **/
            case tokens[i] instanceof Array && __isQuantifier__(types[i+1]):
                result.push([__combineQuantifiers__([tokens[i], types[i]]),
                             GROUP,
                             tokens[i+1],
                             types[i+1]
                            ]);
                i++;
                break;
                
            /** Case of group only **/
            case tokens[i] instanceof Array:
                result.push([__combineQuantifiers__([tokens[i], types[i]]),
                             GROUP,
                             undefined,
                             undefined
                            ]);
                break;
            
            /** Case of no group with quantifier **/
            case __isQuantifier__(types[i+1]):
                result.push([tokens[i],
                             types[i],
                             tokens[i+1],
                             types[i+1]
                            ]);
                i++;
                break;
                
            /** Case of no group only **/
            default:
                result.push([tokens[i],
                             types[i],
                             undefined,
                             undefined
                            ]);
                break;
        }
    }
    
    return result;
};

/**
 * Method stating whether tokentype is quantifier,
 * i.e. equals PLUS || STAR || QUANTIFIER || OPTIONAL;
 */
var __isQuantifier__ = function(type){
    return type === PLUS || type === STAR || type === QUANTIFIER || type === OPTIONAL;
};

/**************************************************/
/**        Private Functions - Tokenise          **/
/**************************************************/
/**
 * Method to tokenise regular expression in preparation for DFA.
 * Returns tokens in form of {tokens: ..., types: ...};
 */
var __tokenise__ = function(regex){
    regex = regex.source;
    
    var tokens = [];
    var tokenTypes = [];
    
    while(regex.length > 0){
        switch(true){
            
            /** Case of escape character **/
            case regex[0] === '\\':
                var res = __handleEscape__(regex.substring(0, 6));
                tokens.push(res);
                tokenTypes.push(ESCAPED);
                regex = regex.replace(res, '');
                break;
                
            /** Case of set **/
            case regex[0] === '[':
                res = __handleSet__(regex);
                tokens.push(res);
                tokenTypes.push(SET);
                regex = regex.replace(res, '');
                break;
                
            /** Case of quantifiers or alternation **/
            case /^[+*?|]/.test(regex) ||
                 /^\{\d+(,\d+)?\}/.test(regex):
                res = __handleQuantifier__(regex);
                tokens.push(res[0]);
                tokenTypes.push(res[1]);
                regex = regex.replace(res[0], '');
                break;
                
            /** Case of group **/
            case regex[0] === '(':
                res = __handleGroup__(regex);
                tokens.push(res[1]);
                tokenTypes.push(res[2]);
                regex = regex.replace(res[0], '');
                break;
                
            /** Case of regular character **/
            default:
                tokens.push(regex[0]);
                tokenTypes.push(REGULAR);
                regex = regex.substring(1);
        }
    }
    
    return [tokens, tokenTypes];
};

/**
 * Method to handle escape characters
 */
var __handleEscape__ = function(string){
    switch(true){
        case /\\\d\d\d/.test(string) && 
             parseInt(string.substring(1, 4), 8) >= 0 &&
             parseInt(string.substring(1, 4), 8) <= 255:
            return string.substring(0, 4);
        case /\\x[0-9a-fA-F]{2}/.test(string):
            return string.substring(0, 4);
        case /\\u[0-9a-fA-F]{4}/.test(string):
            return string.substring(0, 6);
        case /\\c[A-Z]/.test(string):
            return string.substring(0, 3);
        case /\\[tnvfr0.\\+*?^$[\]{}()|/]/.test(string):
            return string.substring(0, 2);
        default:
            return string.substring(1, 2);
    }
};

/**
 * Method to handle character set
 */
var __handleSet__ = function(string){
    var res = '';
    for(var char = 0; char < string.length; char++){
        switch(string[char]){
            case '\\':
                res += '\\';
                res += string[char+1];
                char++;
                break;
            case ']':
                res += string[char];
                return res;
            default:
                res += string[char];
        }
    }
    return res;
};

/**
 * Method to handle quantifiers and alternation symbols
 */
var __handleQuantifier__ = function(string){
    switch(string[0]){
        case '+':
            return [string[0], PLUS];
        case '*':
            return [string[0], STAR];
        case '?':
            return [string[0], OPTIONAL];
        case '|':
            return [string[0], ALTERNATION];
        default:
            return [string.match(/^\{\d+(,\d+)?\}/)[0], QUANTIFIER];
    }
};

/**
 * Method to handle group
 */
var __handleGroup__ = function(string){
    string = string.substring(1);
    var group = '';
    var depth = 1;
    for(var char = 0; char < string.length; char++){
        if(depth === 0)
            break;
        else if(string[char] === '\\'){
            group += string[char] + string[char + 1];
            char++;
            continue;
        }else if(string[char] === '('){
            depth++;
        }else if(string[char] === ')'){
            depth--;
        }
        group += string[char];
    }
    group = group.substring(0, group.length-1);
    
    var tokenised = __tokenise__(new RegExp(group));
    
    return ['(' + group + ')', tokenised[0], tokenised[1]];
};

/**************************************************/
/**                   Export                     **/
/**************************************************/
exports.DFA = DFA;