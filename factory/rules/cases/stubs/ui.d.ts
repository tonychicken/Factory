import type { ReactElement, ReactNode } from "react";
export declare function Button(props: { readonly onPress: () => void | Promise<void>; readonly children: ReactNode }): ReactElement;
export declare function TextField(props: { readonly value: string; readonly onChange: (value: string) => void }): ReactElement;
export declare function MessageList(props: { readonly children: ReactNode }): ReactElement;
/** 卸載時自動取消；永遠呼叫最新的函式 */
export declare function useDebounced<A extends readonly unknown[]>(fn: (...args: A) => void, ms: number): (...args: A) => void;