import * as React from 'react';
import { ToString } from './types';

export interface AutoCompleteItemProps {
    selected: boolean;
    entry: ToString;
    input: string;
    onClick: (e: ToString) => any;
}

const pairs = [
    ['ø', 'oe'],
    ['å', 'aa'],
    ['æ', 'ae']
];


function buildRegexp(input: string) {

    const out = [],
        len = pairs.length;

    for (let i = 0, ii = input.length; i < ii; i++) {
        for (let x = 0; x < len; x++) {
            if ((input[i] == pairs[x][0]) ||
                (input[i] == pairs[x][1][0] &&
                    input[i + 1] == pairs[x][1][1])) {

                out.push(`(?:${pairs[x][0]}|${pairs[x][1]})`);

                if (pairs[x][0] === input[i]) i++;
                else i += pairs[x][1].length;

                break;
            }
        }

        out.push(input[i]);
    }

    return new RegExp(out.join(''), 'i');

}


function highlight(input: string, entry: string) {
    return entry.replace(buildRegexp(input), x => `<b>${x}</b>`);
}


export function AutoCompleteItem(props: AutoCompleteItemProps) {

    return <li
        onClick={_ => {
            props.entry && props.onClick(props.entry);
        }}
        className={props.selected ? 'selected' : ''}>
        <span dangerouslySetInnerHTML={{ __html: highlight(props.input, props.entry.toString()) }} />
    </li>
}