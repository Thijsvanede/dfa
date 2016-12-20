/**************************************************/
/**                   Imports                    **/
/**************************************************/
var HashMap = require('hashmap');

/**************************************************/
/**                  Constructor                 **/
/**************************************************/
/**
 * Constructor:
 * Number is the identifier of the state.
 * Accepting is a boolean stating whether the state is accepting or not.
 */
var State = function(number, accepting){
    this.next = new HashMap();
    this.nr = number;
    this.accepting = accepting;
    this.identifier = undefined;
};

/**************************************************/
/**                    Methods                   **/
/**************************************************/
/**
 * Method returning the number of the state.
 */
State.prototype.getNumber = function(){
    return this.nr;
};

/**
 * Method stating whether the state is accepting.
 */
State.prototype.isAccepting = function(){
    return this.accepting;
};

/**
 * Method returning the identifier of the state.
 */
State.prototype.getIdentifier = function(){
    return this.identifier;
};

/**
 * Method to set the identifier,
 * @param override: if true, it overrides current identifier, otherwise it throws an error.
 */
State.prototype.setIdentifier = function(identifier, override){
    if(identifier === undefined)
        return;
    if(this.identifier !== undefined && this.identifier !== identifier && override !== true)
        throw 'Unable to add identifier ' + identifier + ', state already has identifier: ' + this.identifier;
    else
        this.identifier = identifier;
};

/**
 * Method to add transition to next state.
 * Overrides previous transition existing equivalent transition.
 */
State.prototype.addNext = function(transition, state, identifier){
    transition = new RegExp('^' + transition.source + '$');
    
    switch(true){
        /** Case of existing transition to self. **/
        case this.__isDefinedSelf__(transition):
            if(state === this){
                state.setIdentifier(identifier);
                return state;
            }else
                throw 'Violation of determinism: \'' + transition.source.substring(1, transition.source.length-1) + '\' already defined to self.';
        
        /** Case of existing wildcard transition. **/
        case this.__isDefinedWildcard__(transition):
            throw 'Violation of determinism: wildcard \'.\' clashes with other transitions.';
        
        /** Case of existing transition. **/
        case this.__isDefined__(transition):
            if(state.isAccepting()){
                this.getNext(transition.source.substring(1, transition.source.length-1)).accepting = true;
                this.getNext(transition.source.substring(1, transition.source.length-1)).setIdentifier(identifier);
            }
            if(this.getNext(transition.source.substring(1, transition.source.length-1)) === undefined)
                return this.next.get(transition);
            return this.getNext(transition.source.substring(1, transition.source.length-1));
            
        /** Case of set containing existing transition. **/
        case this.__isPartleyDefined__(transition):
            throw 'Violation of determinism: \'' + transition.source.substring(1, transition.source.length-1) + '\' already defined.';
            
        /** Case of existing transition in set. **/
        case this.__isDefinedInSet__(transition):
            throw 'Violation of determinism: ' + transition.source.substring(1, transition.source.length-1) + ' already defined in set.';
            
        /** Normal case. **/
        default:
            this.next.set(transition, state);
            state.setIdentifier(identifier);
            return state;
    }
};

/**
 * Method to check whether the state has a next state for given transition.
 */
State.prototype.hasNext = function(transition){
    for(var key of this.next.keys()){
        if(key.test(transition)){
            return true;
        }
    }
    return false;
};

/**
 * Method to get the next state after doing given transition.
 */
State.prototype.getNext = function(transition){
    if(!this.hasNext(transition)){
        return undefined;
    }else
        for(var key of this.next.keys()){
            if(key.test(transition))
                return this.next.get(key);
        }
};

/**
 * Method to print state.
 */
State.prototype.toString = function(){
    var trans = "State " + this.nr + " (Accepting = " + this.accepting + "):\n";
    for(var index in this.next.keys()){
        trans = trans.concat('  ' + this.next.keys()[index].source.substring(1, this.next.keys()[index].source.length-1) + ' -> ' + this.next.values()[index].nr + '\n');
    }
    return trans.substr(0, trans.length - 1);
};

/**************************************************/
/**               Private Methods                **/
/**************************************************/
/**
 * Check if transition is already specified to self.
 */
State.prototype.__isDefinedSelf__ = function(transition){
    return this.next.get(transition) === this;
};

/**
 * Check if wildcard '.' is already defined as a transition.
 * Or transition is wildcard and other transitions are already defined.
 */
State.prototype.__isDefinedWildcard__ = function(transition){
    return this.next.get(new RegExp(/^.$/)) !== undefined || (transition.source === '^.$' && this.next.count() !== 0);
};

/**
 * Check if transition is already specified
 */
State.prototype.__isDefined__ = function(transition){
    return this.next.get(transition) !== undefined;
};

/**
 * Check if (part of) transition is already specified as next transition.
 */
State.prototype.__isPartleyDefined__ = function(transition){
    switch(true){
        /** Case where entire transition is already defined. **/
        case this.__isDefined__(transition):
            return true;
        
        /** Case where transition is set. **/
        case transition.source.startsWith('^['):
            for(var trans of this.next.keys()){
                if(trans.source.startsWith('^[') && __hasOverlapExp__(trans, transition))
                    return true;
                else if(__containsCharExp__(transition, trans))
                    return true;
            }
            return false;
            
        /** Case where transition or part of transition is not yet defined. **/
        default:
            return false;
    }
};

/**
 * Check if transition is already defined within other sets.
 */
State.prototype.__isDefinedInSet__ = function(transition){
    var set = transition.source.startsWith('^[');
    
    for(var entry of this.next.keys()){
        if(entry.source.startsWith('^[')){
            if(set && __hasOverlapExp__(entry, transition))
                return true;
            else if(!set && __containsCharExp__(entry, transition))
                return true;
        }
    }
    return false;
};

/**
 * Check if set contains char.
 */
var __containsCharExp__ = function(set, char){
    return __containsChar__(set.source.substring(1, set.source.length-1), char.source.substring(1, char.source.length-1));
};

/**
 * Check if set contains char.
 */
var __containsChar__ = function(set, char){
    if(char === '\\')
        char = '\\\\';
    else if(char === '-')
        char = '\\-';
    return __hasOverlap__(set, '['+ char + ']');
};

var __hasOverlapExp__ = function(setA, setB){
    return __hasOverlap__(setA.source.substring(1, setA.source.length-1), setB.source.substring(1, setB.source.length-1));
};

/**
 * Check if sets have overlap.
 */
var __hasOverlap__ = function(setA, setB){
    
    var SetA = new Set();
    var SetB = new Set();
    
    for(var i = 1; i < setA.length-1; i++)
        switch(true){
            case setA[i] === '\\':
                SetA.add(setA[i+1]);
                i++;
                break;
            case setA[i+1] === '-':
                SetA.add([setA[i], setA[i+2]]);
                i += 2;
            default:
                SetA.add(setA[i]);
                break;
        }
        
    for(i = 1; i < setB.length-1; i++)
        switch(true){
            case setB[i] === '\\':
                SetB.add(setB[i+1]);
                i++;
                break;
            case setB[i+1] === '-':
                SetB.add([setB[i], setB[i+2]]);
                i += 2;
            default:
                SetB.add(setB[i]);
                break;
        }
    
    var shortest = SetA.size < SetB ? SetA : SetB;
    var longest = SetA.size < SetB ? SetB : SetA;
    
    /** Check if in range **/
    for(var shortestItem of shortest.values()){
        if(shortestItem instanceof Array){
            var smallest = shortestItem.sort();
            var largest = smallest[1];
                smallest = smallest[0];
                
            for(var longestItem of longest.values()){
                if(longestItem instanceof Array){
                    var smallestLong = longestItem.sort();
                    var largestLong = smallestLong[1];
                        smallestLong = smallestLong[0];
                        
                    if(smallest <= largestLong && largest >= smallestLong)
                        return true;
                }else{
                    if(longestItem >= smallest && longestItem <= largest)
                        return true;
                }
            }
        }
    }
    
    for(shortestItem of longest.values()){
        if(shortestItem instanceof Array){
            smallest = shortestItem.sort();
            largest = smallest[1];
            smallest = smallest[0];
                
            for(longestItem of shortest.values()){
                if(longestItem instanceof Array){
                    smallestLong = longestItem.sort();
                    largestLong = smallestLong[1];
                        smallestLong = smallestLong[0];
                        
                    if(smallest <= largestLong && largest >= smallestLong)
                        return true;
                }else{
                    if(longestItem >= smallest && longestItem <= largest)
                        return true;
                }
            }
        }
    }
    
    for(var char of shortest.values()){
        if(longest.has(char))
            return true;
    }
    return false;
};

/**************************************************/
/**                   Export                     **/
/**************************************************/
exports.State = State;