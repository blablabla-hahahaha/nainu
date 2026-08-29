// 本文件由 web/scripts/gen-dsl.mjs 从 nainu-agi-common/src/main/resources/dsl/workflow-dsl.schema.json 生成——请勿手改。

export type DslNodeType = "START" | "END" | "CONDITION" | "DEBUG" | "SCRIPT";

/**
 * Nainu AGI workflow 规范 DSL 的单一权威契约：结构校验、TS 类型生成与 Java 模型都以本文件为准。条件路由以 typed conditional edge 表示（edge.condition）；图级规则（START 唯一、DAG、引用可解析、ELSE 最后）由各侧图校验器实现，不在此表达。
 */
export interface WorkflowDSL {
  id: string;
  name: string;
  /**
   * 乐观锁：保存时 +1
   */
  version?: number;
  /**
   * 工作流元数据；视图状态（位置/视口）按约定放 meta.view
   */
  meta?: {};
  nodes: DslNode[];
  edges: DslEdge[];
}
export interface DslNode {
  id: string;
  type: DslNodeType;
  /**
   * 节点参数，结构由各节点类型的 per-type schema 约束（随节点目录演进）
   */
  config?: {};
  input?: DslInputField[];
  output?: DslOutputField[];
}
export interface DslInputField {
  key: string;
  type: "INTERNAL_REF" | "CUSTOM" | "EXTERNAL_REF";
  value: string;
}
export interface DslOutputField {
  key: string;
  /**
   * 引用名；为空时使用 key
   */
  keyAlias?: string;
}
export interface DslEdge {
  id: string;
  source: string;
  target: string;
  /**
   * 多出向连接点标识；条件分支边用它区分分支
   */
  sourceHandle?: string;
  condition?: DslCondition;
}
export interface DslCondition {
  branchType: "IF" | "ELIF" | "ELSE";
  logicOperator?: "AND" | "OR";
  conditions?: DslCompare[];
}
export interface DslCompare {
  field: DslInputField;
  operator: "EQUALS" | "NOT_EQUALS" | "CONTAINS" | "NOT_CONTAINS" | "IS_EMPTY" | "IS_NOT_EMPTY";
  value: string;
}
