/**
 * UI 파일에는 export 1개만 허용 (UI 렌더링 함수 = 컴포넌트 1개)
 * - type-only export는 제외
 */
export default {
  meta: {
    type: "suggestion",
    docs: {
      description: "UI 파일에는 하나의 export만 허용합니다.",
    },
    schema: [],
    messages: {
      oneExportOnly:
        "UI 파일에는 하나의 export만 허용됩니다. 현재 {{count}}개가 있습니다.",
    },
  },
  create(context) {
    const exportNodes = [];

    return {
      ExportNamedDeclaration(node) {
        if (node.exportKind === "type") return;
        if (node.declaration) {
          exportNodes.push(node);
        } else {
          const valueSpecifiers = node.specifiers.filter(
            (specifier) => specifier.exportKind !== "type",
          );
          valueSpecifiers.forEach(() => exportNodes.push(node));
        }
      },
      ExportDefaultDeclaration(node) {
        exportNodes.push(node);
      },
      "Program:exit"() {
        if (exportNodes.length > 1) {
          context.report({
            node: exportNodes[1],
            messageId: "oneExportOnly",
            data: { count: exportNodes.length },
          });
        }
      },
    };
  },
};
