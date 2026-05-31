/**
 * Condition 节点的类型定义与 support 对象。
 * 包含比较运算符、逻辑运算符、分支运算符的类型与辅助方法。
 */
import {
    type node_field_definition,
    node_field_definition_support,
} from "@/components/workflow/extends/node-field/node-field";

/**
 * 比较运算符类型（字段间的判断方式）。
 */
export type compare_type =
    | 'CONTAINS'
    | 'NOT_CONTAINS'
    | 'IS_EMPTY'
    | 'IS_NOT_EMPTY'
    | 'EQUALS'
    | 'NOT_EQUALS';

/**
 * 比较运算符定义（单条条件：对某个字段做某种比较）。
 */
export interface compare_operator_definition {
    field: node_field_definition;
    type: compare_type;
    value?: node_field_definition;
}

/**
 * compare_operator_definition 的 support 对象：常量、选项、标签、默认值、纯工具函数。
 */
export const compare_operator_definition_support = {
    CONTAINS: 'CONTAINS' as const,
    NOT_CONTAINS: 'NOT_CONTAINS' as const,
    IS_EMPTY: 'IS_EMPTY' as const,
    IS_NOT_EMPTY: 'IS_NOT_EMPTY' as const,
    EQUALS: 'EQUALS' as const,
    NOT_EQUALS: 'NOT_EQUALS' as const,

    /**
     * 返回所有比较运算符的选项列表（用于 Select 组件）。
     */
    getOptions(): { label: string; value: compare_type; needValue: boolean }[] {
        return [
            { label: '包含', value: 'CONTAINS', needValue: true },
            { label: '不包含', value: 'NOT_CONTAINS', needValue: true },
            { label: '为空', value: 'IS_EMPTY', needValue: false },
            { label: '不为空', value: 'IS_NOT_EMPTY', needValue: false },
            { label: '等于', value: 'EQUALS', needValue: true },
            { label: '不等于', value: 'NOT_EQUALS', needValue: true },
        ];
    },

    /**
     * 返回比较运算符的中文标签。
     */
    getLabel(operator: compare_type): string {
        switch (operator) {
            case 'CONTAINS': return '包含';
            case 'NOT_CONTAINS': return '不包含';
            case 'IS_EMPTY': return '为空';
            case 'IS_NOT_EMPTY': return '不为空';
            case 'EQUALS': return '等于';
            case 'NOT_EQUALS': return '不等于';
        }
    },

    /**
     * 判断该运算符是否需要 value 字段。
     */
    isValueRequired(type: compare_type): boolean {
        return this.getOptions().find(o => o.value === type)?.needValue ?? true;
    },

    /**
     * 返回一条默认的 compare_operator_definition。
     */
    getDefaultDefinition(): compare_operator_definition {
        return {
            field: node_field_definition_support.getDefaultDefinition(),
            type: compare_operator_definition_support.EQUALS,
            value: node_field_definition_support.getDefaultDefinition(),
        };
    },

    /**
     * 纯函数：将节点字段定义的值转换为显示用字符串。
     * undefined / null / '' → ''；非 string 类型 → String()。
     */
    stringifyField(f: { type?: string; value?: unknown; alias?: string } | undefined): string {
        if (!f) return '';
        const val = f.value;
        if (val === undefined || val === null || val === '') return '';
        return typeof val === 'string' ? val : String(val);
    },
};


/**
 * 逻辑运算符类型（多条条件之间的组合方式）。
 */
export type logic_type = 'AND' | 'OR';

/**
 * 分支类型（条件分支类别）。
 */
export type branch_type = 'IF' | 'ELIF' | 'ELSE';

/**
 * 分支运算符定义（一条分支，包含逻辑关系和一组 compare 条件）。
 * 继承 Record<string, unknown> 以支持作为 GraphEdge 的 data 类型。
 */
export interface branch_operator_definition extends Record<string, unknown> {
    type: branch_type;
    logic?: logic_type;
    compares?: compare_operator_definition[];
}

/**
 * branch_operator_definition 的 support 对象：常量、选项、默认分支、归一化、补全。
 */
export const branch_operator_definition_support = {
    LOGIC: {
        AND: 'AND' as const,
        OR: 'OR' as const,
    } as const,

    BRANCH: {
        IF: 'IF' as const,
        ELIF: 'ELIF' as const,
        ELSE: 'ELSE' as const,
    } as const,

    /**
     * 返回所有逻辑运算符的选项列表（用于 Select 组件）。
     */
    getLogicOptions(): { label: string; value: logic_type; }[] {
        return [
            { label: '且', value: 'AND'},
            { label: '或', value: 'OR' },
        ];
    },

    /**
     * 返回逻辑运算符的中文标签。
     */
    getLogicLabel(logic: logic_type): string {
        switch (logic) {
            case 'AND': return '且';
            case 'OR': return '或';
        }
    },

    /**
     * 在 AND / OR 之间切换。
     */
    switchLogic(logic: logic_type): logic_type {
        switch (logic) {
            case this.LOGIC.AND: return this.LOGIC.OR;
            case this.LOGIC.OR: return this.LOGIC.AND;
        }
    },

    /**
     * 返回一条默认的 IF 分支定义（带 AND 逻辑和一条 compare）。
     */
    getIfDefinition(): branch_operator_definition {
        return {
            type: branch_operator_definition_support.BRANCH.IF,
            logic: branch_operator_definition_support.LOGIC.AND,
            compares: [
                compare_operator_definition_support.getDefaultDefinition()
            ],
        };
    },

    /**
     * 返回一条默认的 ELIF 分支定义。
     */
    getElifBranchDefinition(): branch_operator_definition {
        return {
            type: branch_operator_definition_support.BRANCH.ELIF,
            logic: branch_operator_definition_support.LOGIC.AND,
            compares: [
                compare_operator_definition_support.getDefaultDefinition()
            ],
        };
    },

    /**
     * 返回一条默认的 ELSE 分支定义。
     */
    getElseBranchDefinition(): branch_operator_definition {
        return {
            type: branch_operator_definition_support.BRANCH.ELSE,
        };
    },

    /**
     * 返回一条默认的 ELSE 分支定义（无 compare）。
     */
    getElseDefinition(): branch_operator_definition {
        return {
            type: branch_operator_definition_support.BRANCH.ELSE,
        };
    },

    /**
     * 将原始数据归一化为标准 branch_operator_definition。
     * 兼容两种字段命名：type / branchType、logic / logicOperator、compares / rules。
     */
    normalize(raw: unknown): branch_operator_definition {
        const b = (raw ?? {}) as Record<string, unknown>;
        const type = (b.type ?? b.branchType ?? 'IF') as branch_type;
        const logic = (b.logic ?? b.logicOperator) as logic_type | undefined;
        const compares_raw = (b.compares ?? b.rules ?? []) as unknown[];
        const compares = compares_raw.length > 0
            ? compares_raw as compare_operator_definition[]
            : undefined;
        const result: branch_operator_definition = { type };
        if (logic) result.logic = logic;
        if (compares) result.compares = compares;
        return result;
    },

    /**
     * 确保分支数组以 IF 开头、ELSE 结尾。
     * 空数组返回 [IF, ELSE]；首不是 IF 则补 IF；尾不是 ELSE 则补 ELSE。
     */
    ensureComplete(branches: branch_operator_definition[]): branch_operator_definition[] {
        if (branches.length === 0) {
            return [
                branch_operator_definition_support.getIfDefinition(),
                branch_operator_definition_support.getElseDefinition(),
            ];
        }
        let result = [...branches];
        if (result[0].type !== 'IF') {
            result = [branch_operator_definition_support.getIfDefinition(), ...result];
        }
        if (result[result.length - 1].type !== 'ELSE') {
            result = [...result, branch_operator_definition_support.getElseDefinition()];
        }
        return result;
    },
};
