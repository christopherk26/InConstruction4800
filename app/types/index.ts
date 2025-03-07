
// this file is not used yet for any reason fyi 

export * from './database';
export type RecursiveObject = {
    [key: string]: RecursiveValue;
  };
  
  export type RecursiveValue = 
    | string 
    | number 
    | boolean 
    | Date 
    | null 
    | undefined 
    | RecursiveObject 
    | RecursiveValue[];