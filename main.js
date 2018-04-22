var TOKEN_TYPE = {
    LBRACK: '(',
    RBRACK: ')',
    STAR: '*',
    OR: '|',
    END: '#',
    EMPTY: 'ε',
    UNKNOWN: 'unknown',
    REGCHAR: 'a-z',
    CONCAT: '+'
};
  
function isRegChar(regChar) {
    return (regChar >= 'a' && regChar <= 'z');
}
  
// class Token
function Token(type, text) {
    this.type = type;
    this.text = text;
}
    
var EMPTYTOKEN = new Token(TOKEN_TYPE.EMPTY, 'ε');
var CONCATTOKEN = new Token(TOKEN_TYPE.CONCAT, '+');
var ENDTOKEN = new Token(TOKEN_TYPE.END,'#');

// class Lexer
function Lexer(regString) {
    this.regString = regString;
    this.index = 0;
};
    
Lexer.prototype.hasNext = function() {
    if (this.regString)
        return this.index < this.regString.length;
    return false;
}
  
Lexer.prototype.nextToken = function() {
    while (this.hasNext()) {
        switch (this.regString[this.index]) {
            case '(':
            this._consume();
            return new Token(TOKEN_TYPE.LBRACK, '(');
            case ')':
            this._consume();
            return new Token(TOKEN_TYPE.RBRACK, ')');
            case '*':
            this._consume();
            return new Token(TOKEN_TYPE.STAR, '*');
            case '|':
            this._consume();
            return new Token(TOKEN_TYPE.OR, '|');
            default:
            if (isRegChar(this.regString[this.index]))
                return new Token(TOKEN_TYPE.REGCHAR, this.regString[this.index++]);
            else
                throw new Error('Unknown type of ' + this.regString[this.index]);
        }
    }
    return new Token(TOKEN_TYPE.END, 'EOF');
}

Lexer.prototype._consume = function() {
    return ++this.index;
}

//class Node
function Node(token){
    this.token = token;
    this.left = EMPTYTOKEN;
    this.right = EMPTYTOKEN;
    this.nullable = true;
    this.firstPos = new Array();
    this.lastPos = new Array();
}

var EMPTYNODE = new Node(EMPTYTOKEN);

window.onload = init;

function init(){
    regexInput="";
    $("#submitButton").click(function(){main()});
}

function main(){
    getInput();
    isValidRegex = validateRegex();
    counter=0;
    regCharPos = new Array(); //Frequency array of each character used
    if(isValidRegex){
        lexer = new Lexer(regexInput);
        var syntaxTree = createSyntaxTree(lexer);
        SetFirstAndLastPos(syntaxTree);
        followPos = new Array(); //Array which contains all followPos arrays
        for(var i = 1; i <= counter; i++){
            followPos[i] = new Array();
        }
        alphabet = {}; //dictionary which contains the alphabet of regex and firstPos of each character
        setAlphabet(regCharPos);
        computeFollowPos(syntaxTree);
        computeDFAStates(syntaxTree);
        printDFAStates();
    }
}

function setAlphabet(inputArray){ //insert each distinct character of the alphabet and assign it an array with all its firstPoss
    for(var i = 1; i<inputArray.length; i++){
        if(false == Array.isArray(alphabet[inputArray[i]])){
            alphabet[inputArray[i]] = new Array();
        }
        alphabet[inputArray[i]].push(i);
    }

}

function getInput(){
    regexInput = $("#regexInput").val();
}

function validateRegex(){ // TODO: check if () are correct
    if("" == regexInput){
        return false;
    }
    return true;

}

function createSyntaxTree(lexer){ //TODO: add error cases for **,*|,|*,||
    var root = EMPTYNODE;
    var currentToken = lexer.nextToken();
    while(TOKEN_TYPE.END != currentToken.type){
        var node = null;
        switch (currentToken.type){
            case TOKEN_TYPE.LBRACK:
                node = createSyntaxTree(lexer);
                switch (root.token.type){
                    case TOKEN_TYPE.EMPTY:
                        root = node;
                        break;
                    default:    // REGCHAR, CONCAT, STAR cases..
                        var aux = new Node(CONCATTOKEN);
                        aux.left = root;
                        aux.right = node;
                        aux.nullable = aux.left.nullable && aux.right.nullable;
                        root = aux;
                        break;
                }
                break;

            case TOKEN_TYPE.RBRACK:
                return root;
                break;

            case TOKEN_TYPE.REGCHAR:
                node = new Node(currentToken);
                node.nullable = false;
                switch(root.token.type){
                    case TOKEN_TYPE.EMPTY:
                        root = node;
                        break;
                    default:    // REGCHAR, CONCAT, STAR cases..
                        var aux = new Node(CONCATTOKEN);
                        aux.left = root;
                        aux.right = node;
                        aux.nullable = aux.left.nullable && aux.right.nullable;
                        root = aux;
                        break;
                }
                break;

            case TOKEN_TYPE.STAR:
                node = new Node(currentToken);
                node.nullable = true;
                switch (root.token.type){
                    case TOKEN_TYPE.CONCAT:
                        node.left=root.right;
                        root.right=node;    
                        break;
                    default: // EMPTY,REGCHAR,STAR,OR
                        node.left=root;
                        root = node;
                        break;
                }
                break;

            case TOKEN_TYPE.OR:
                node = new Node(currentToken);
                switch(root.token.type){
                    case TOKEN_TYPE.EMPTY:
                        alert('ERROR! \'OR\' CANNOT HAVE \'EMPTY\' ON LEFT BRANCH');
                        return;
                        break;
                    default://REGCHAR,OR,STAR,CONCAT
                        node.left=root;
                        node.right=createSyntaxTree(lexer);
                        node.nullable = node.left.nullable || node.right.nullable;
                        root = node;
                        return root;
                        break;
                }
                break;
                    
                

        }

        if(null == node) {
            alert('NO NODE AVAILABLE');
            return ;
        }
        currentToken = lexer.nextToken();

    }
    var endNode = new Node(ENDTOKEN);
    endNode.nullable=false;
    var aux = new Node(CONCATTOKEN);
    aux.left= root;
    aux.right= endNode;
    aux.nullable = aux.left.nullable && aux.right.nullable;
    root = aux;

    return root;
}

function SetFirstAndLastPos(root){
    if(root.left!=null && root.right!=null){
        SetFirstAndLastPos(root.left);
        SetFirstAndLastPos(root.right);
        switch (root.token.type){
            case TOKEN_TYPE.REGCHAR:
                root.firstPos.push(++counter);
                root.lastPos.push(counter);
                regCharPos[counter]=root.token.text;
                break;
            case TOKEN_TYPE.END:
                root.firstPos.push(++counter);
                root.lastPos.push(counter);
                break;
            case TOKEN_TYPE.STAR:
                root.firstPos=root.left.firstPos;
                root.lastPos=root.left.lastPos;
                break;
            case TOKEN_TYPE.OR:
                root.firstPos=root.left.firstPos.concat(root.right.firstPos);
                root.lastPos=root.left.lastPos.concat(root.right.lastPos);
                break;
            case TOKEN_TYPE.CONCAT:
                if(true == root.left.nullable){
                    root.firstPos=root.left.firstPos.concat(root.right.firstPos);
                }
                else root.firstPos=root.left.firstPos;

                if(true == root.right.nullable){
                    root.lastPos=root.left.lastPos.concat(root.right.lastPos);
                }
                else root.lastPos=root.right.lastPos;
                break;
        }
    }
}

function computeFollowPos(root){
    if(root.left!=null && root.right!=null){
        computeFollowPos(root.left);
        computeFollowPos(root.right);

        switch(root.token.type){
            case TOKEN_TYPE.STAR:
                root.lastPos.forEach(function(element){
                    followPos[element]=followPos[element].concat(root.firstPos);
                });
                break;
            case TOKEN_TYPE.CONCAT:
                root.left.lastPos.forEach(function(element){
                    followPos[element]=followPos[element].concat(root.right.firstPos);
                });
                break;
        }

    }
}

function stateExists(state){
    var keys = Object.keys(DSTATES);
    if(keys.includes(state.toString())){
        return true;
    }
    else{
        return false;
    }
}
function computeDFAStates(root){
    var queue = new Array();
    var distinctKeys = Object.keys(alphabet);
    DSTATES = {};
    queue.push(root.firstPos);
    var currentState=queue.shift(); //retrieve initial State
    while(currentState){
        DSTATES[currentState] = new Array();
        for(var i = 0; i < distinctKeys.length; i++){ // for each transition a,b,..
            var newState = new Array();
            currentState.forEach(function(element){
                if(alphabet[distinctKeys[i]].includes(element)==true){
                    newState = newState.concat(followPos[element]);
                }
            });
            DSTATES[currentState][[distinctKeys[i]]] = newState;
            if(false==stateExists(newState)){
                queue.push(newState);
            }
        }
        currentState=queue.shift();
    }

}

function printDFAStates(){
    output = $("#output");
    var states = Object.keys(DSTATES);
    var transitions = Object.keys(alphabet);
    output.append("Initial State: [" + states[0] + "]<br>");
    output.append("Accepting States: ");
    states.forEach(function(element){
        if (element.includes(counter)){
            output.append("["+element+"] ");
        }
    });
    output.append("<br> Transitions: <br>");
    states.forEach(function(state){
        transitions.forEach(function(transition){
            output.append("𝛿( ["+state+"] , " + transition+" ) = ["+ DSTATES[state][transition].toString() + "]<br>");
        });
    });
}