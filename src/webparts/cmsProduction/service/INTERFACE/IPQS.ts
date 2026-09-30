export interface IOptionMaster {
  ID?: number;
  OptionType: string;
  OptionValue: string;
  SubOptionValue: string;
  type: string;
}

export interface IUser {
  ID: number;
  Title: string;
  EMail: string;
}

export interface IApprover {
  ID?: number;
  Title: string;
  Users: IUser[];
  type?: string;
}