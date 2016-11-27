export class Tel {
    constructor(public Number?: string,
                public Kind?: number,
                public Description?: string) {
        this.Kind = this.Kind || 1;
    }
}

export class User {
    constructor(public CountryCode?: string,
                public FirstName?: string,
                public Phone?: Tel) {
        this.Phone = this.Phone || new Tel(); 
    }

    IsOnline: boolean;
}