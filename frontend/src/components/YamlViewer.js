import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import yaml from 'js-yaml';

const YamlViewer = ({ data }) => {
    const yamlString = yaml.dump(data, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
        sortKeys: true
    });

    return (
        <div className="bg-white rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b">
                <h3 className="text-sm font-medium text-gray-700">YAML</h3>
            </div>
            <div className="p-4">
                <SyntaxHighlighter
                    language="yaml"
                    style={vscDarkPlus}
                    customStyle={{
                        margin: 0,
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        lineHeight: '1.25rem'
                    }}
                >
                    {yamlString}
                </SyntaxHighlighter>
            </div>
        </div>
    );
};

export default YamlViewer; 