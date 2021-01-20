export enum CONTAINER{
    NONE,
    SINGULAR,
    LIST
}
export let SINGULAR = CONTAINER.SINGULAR;
export let LIST = CONTAINER.LIST;

export enum REF_TYPE{
    NONE,
    ONE_TO_ONE,
    ONE_TO_MANY,
    MANY_TO_ONE,
    MANY_TO_MANY,
}
export let ONE_TO_ONE = REF_TYPE.ONE_TO_ONE;
export let ONE_TO_MANY = REF_TYPE.ONE_TO_MANY;
export let MANY_TO_ONE = REF_TYPE.MANY_TO_ONE;
export let MANY_TO_MANY = REF_TYPE.MANY_TO_MANY;



class Tbase {
    private C = CONTAINER.SINGULAR;

    constructor(C?:CONTAINER){
        if(C) this.C = C;
    }

    list = () => {
        this.C = CONTAINER.LIST;
        return this;
    }

}
class Tnumber extends Tbase {
    private o:{
        isList:     boolean,
        min:        number[],
        max:        number[],
    } = {
        isList: false,
        min: [],
        max: [],
    }

    constructor(C?:CONTAINER){
        super(C);
    }
    
    min = (m: number) :Tnumber => {
        this.o.min.push(m);
        return this
    };

    max = (M:number): Tnumber => {
        this.o.max.push(M);
        return this;
    }
}


class Tstring extends Tbase {
    private o:{
        maxLength: number
        regex: RegExp[]
    } = {
        maxLength: Infinity,
        regex: [],
    }

    constructor(C?:CONTAINER){
        super(C);
    }


    regex = (r: RegExp): Tstring => {
        this.o.regex.push(r);
        return this;
    }

    maxLength = (n: number) => {
        this.o.maxLength = n;
        return this;
    }
}


class Ref{
    private o:{
        type: REF_TYPE,
        typeName: string,
    }={
        type: REF_TYPE.ONE_TO_ONE,
        typeName: ""
    }

    constructor(typeName: string, T?:REF_TYPE){
        if(T) this.o.type = T;
    }

    oneToOne = () => {
        this.o.type = REF_TYPE.ONE_TO_ONE
    }
    oneToMany = () => {
        this.o.type = REF_TYPE.ONE_TO_MANY
    }
    manyToOne = () => {
        this.o.type = REF_TYPE.MANY_TO_ONE
    }
    manyToMany = () => {
        this.o.type = REF_TYPE.MANY_TO_MANY
    }
}

export let number   = (C?:CONTAINER) => new Tnumber(C);
export let string   = (C?:CONTAINER) => new Tstring(C);
export let ref      = (typeName: string, T?: REF_TYPE) => new Ref(typeName, T);

export let a = {
    number,
    string,
    ref
}

export let t = {
    LIST,
    ONE_TO_ONE,
    ONE_TO_MANY,
    MANY_TO_ONE,
    MANY_TO_MANY,
}


