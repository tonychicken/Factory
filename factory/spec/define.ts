// 規格的型別。漏寫就編譯不過（02 §4）。

/** 每個決定都要說明從哪來（02 §5） */
export type Decision =
  | { readonly from: "owner"; readonly ref: string }
  | { readonly from: "rule"; readonly ref: string }
  | { readonly from: "convention"; readonly why: string }
  | { readonly from: "assumption"; readonly question: string; readonly chosen: string };

type Happens<S extends string, F extends string, A extends string, D extends string> = {
  readonly to: S;
  /** 每一方看到什麼，都要寫 */
  readonly see: Readonly<Record<A, string>>;
  /** 可比對的效果；空實作過不了 */
  readonly effects: readonly F[];
  readonly by: D;
  readonly temporary?: { readonly recoverWhen: string };
};
/** 伺服器收到但不接受：狀態不變、要記錄、要告訴送的人 */
type Refuse<D extends string> = { readonly refuse: string; readonly by: D };
/** 只有畫面流程可以寫「不會發生」，而且也要說明是誰決定的 */
type Never<D extends string> = { readonly never: string; readonly by: D };

export type AnyCell = Happens<string, string, string, string> | Refuse<string> | Never<string>;

interface Common<S extends string, E extends string, F extends string, A extends string, D extends string> {
  readonly id: string;
  readonly title: string;
  readonly states: { readonly [K in S]: string };
  /** 「離線」這類事件要指出怎麼恢復 */
  readonly events: { readonly [K in E]: string | { readonly title: string; readonly back: NoInfer<E> } };
  readonly effects: { readonly [K in F]: string };
  readonly audience: { readonly [K in A]: string };
  readonly decisions: { readonly [K in D]: Decision };
  readonly initial: NoInfer<S>;
  /** 一開始每一方看到什麼 */
  readonly start: { readonly see: Readonly<Record<NoInfer<A>, string>>; readonly by: NoInfer<D> };
}

type Matrix<S extends string, E extends string, C> = Readonly<Record<S, Readonly<Record<E, C>>>>;

export type Flow<S extends string = string, E extends string = string, F extends string = string, A extends string = string, D extends string = string> =
  | (Common<S, E, F, A, D> & {
      readonly kind: "lifecycle";
      readonly ends: readonly NoInfer<S>[];
      readonly matrix: Matrix<NoInfer<S>, NoInfer<E>, Happens<NoInfer<S>, NoInfer<F>, NoInfer<A>, NoInfer<D>> | Refuse<NoInfer<D>>>;
    })
  | (Common<S, E, F, A, D> & {
      readonly kind: "interaction";
      readonly ends?: readonly NoInfer<S>[];
      readonly matrix: Matrix<NoInfer<S>, NoInfer<E>, Happens<NoInfer<S>, NoInfer<F>, NoInfer<A>, NoInfer<D>> | Never<NoInfer<D>>>;
    });

export function defineFlow<const S extends string, const E extends string, const F extends string, const A extends string, const D extends string>(
  flow: Flow<S, E, F, A, D>,
): Flow<S, E, F, A, D> {
  return flow;
}

/** 狀態圖表達不了的業務規則，例如先來先服務。一定要有例子 */
export interface Rule {
  readonly id: string;
  readonly title: string;
  readonly statement: string;
  readonly examples: readonly [Example, ...Example[]];
  readonly by: Decision;
}
export interface Example {
  readonly given: string;
  readonly then: string;
}
export function defineRules<const R extends readonly Rule[]>(rules: R): R {
  return rules;
}

/** 會顯示「一份內容」的區塊 */
export interface Content {
  readonly id: string;
  readonly title: string;
  readonly source: "fixed" | "setting" | "system" | "llm";
  readonly maintainer: string;
  readonly refresh: string;
  readonly whenEmpty: string;
  readonly whenError: string;
  readonly visibleTo: readonly string[];
  readonly by: Decision;
}
export function defineContent<const C extends readonly Content[]>(content: C): C {
  return content;
}

/** 功能拆成可以判斷的子句；編號 v0.1/F2.c */
export interface Feature {
  readonly id: string;
  readonly title: string;
  readonly clauses: { readonly [key: string]: string };
}
export function defineFeatures<const F extends readonly Feature[]>(features: F): F {
  return features;
}

/** 負責人拍板的事。只有這裡有的編號才能寫 from: "owner" */
export interface OwnerDecision {
  readonly id: string;
  readonly text: string;
  readonly on: string;
}
export function defineOwnerDecisions<const O extends readonly OwnerDecision[]>(list: O): O {
  return list;
}

export interface Spec {
  readonly features: readonly Feature[];
  readonly owner: readonly OwnerDecision[];
  readonly flows: readonly Flow[];
  readonly rules: readonly Rule[];
  readonly contents: readonly Content[];
}