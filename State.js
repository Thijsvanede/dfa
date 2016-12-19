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
        case this.isDefinedSelf(transition):
            if(state === this){
                state.setIdentifier(identifier);
                return state;
            }else
                throw 'Violation of determinism: \'' + transition.source.substring(1, transition.source.length-1) + '\' already defined to self.';
        
        /** Case of existing transition. **/
        case this.isDefined(transition):
            if(state.isAccepting()){
                this.getNext(transition.source.substring(1, transition.source.length-1)).accepting = true;
                this.getNext(transition.source.substring(1, transition.source.length-1)).setIdentifier(identifier);
            }
            return this.getNext(transition.source.substring(1, transition.source.length-1));
            
        /** Case of set containing existing transition. **/
        case this.isPartleyDefined(transition):
            throw 'Violation of determinism: \'' + transition.source.substring(1, transition.source.length-1) + '\' already defined.';
            
        /** Case of existing transition in set. **/
        case this.isDefinedInSet(transition):
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
State.prototype.isDefinedSelf = function(transition){
    return this.next.get(transition) === this;
};

/**
 * Check if transition is already specified
 */
State.prototype.isDefined = function(transition){
    return this.next.get(transition) !== undefined;
};

/**
 * Check if (part of) transition is already specified as next transition.
 */
State.prototype.isPartleyDefined = function(transition){
    switch(true){
        /** Case where entire transition is already defined. **/
        case this.isDefined(transition):
            return true;
        
        /** Case where transition is set. **/
        case transition.source.startsWith('^['):
            for(var trans of this.next.keys()){
                if(trans.source.startsWith('^[') && hasOverlapExp(trans, transition))
                    return true;
                else if(containsCharExp(transition, trans))
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
State.prototype.isDefinedInSet = function(transition){
    var set = transition.source.startsWith('^[');
    
    for(var entry of this.next.keys()){
        if(entry.source.startsWith('^[')){
            if(set && hasOverlapExp(entry, transition))
                return true;
            else if(!set && containsCharExp(entry, transition))
                return true;
        }
    }
    return false;
};

/**
 * Check if set contains char.
 */
var containsCharExp = function(set, char){
    return containsChar(set.source.substring(1, set.source.length-1), char.source.substring(1, char.source.length-1));
};

/**
 * Check if set contains char.
 */
var containsChar = function(set, char){
    if(char === '\\')
        char = '\\\\';
    return hasOverlap(set, '['+ char + ']');
};

var hasOverlapExp = function(setA, setB){
    return hasOverlap(setA.source.substring(1, setA.source.length-1), setB.source.substring(1, setB.source.length-1));
};

/**
 * Check if sets have overlap.
 */
var hasOverlap = function(setA, setB){
    var SetA = new Set();
    var SetB = new Set();
    
    for(var i = 1; i < setA.length-1; i++)
        switch(setA[i]){
            case '\\':
                SetA.add(setA[i+1]);
                i++;
                break;
            default:
                SetA.add(setA[i]);
                break;
        }
        
    for(i = 1; i < setB.length-1; i++)
        switch(setB[i]){
            case '\\':
                SetB.add(setB[i+1]);
                i++;
                break;
            default:
                SetB.add(setB[i]);
                break;
        }
    
    var shortest = SetA.size < SetB ? SetA : SetB;
    var longest = SetA.size < SetB ? SetB : SetA;
    
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