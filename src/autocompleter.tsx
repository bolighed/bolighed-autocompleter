import * as React from 'react';
import { Resolvable, resolve, has, isFunction } from '@viewjs/utils';
import { KeyCode } from './constants';
import { ToString } from './types';
import { AutoCompleteItem } from './autocompleter-item';
import { debounce, bind } from 'decko';


export interface AutoCompleterProps<M extends ToString> {
    name?: string;
    className?: string;
    requestQuery: Resolvable<M[], string>
    placeholder?: string;
    index?: number;
    open?: boolean;
    value?: M;
    autoFocus?: boolean;
    disabled?: boolean;
    showClearButton?: boolean;
    onSelect?: (m: M) => any;
    onClose?: () => any;
    onBlur?: (e: React.FormEvent) => any;
    onReset?: () => any;
    buildItem?: (item: M, selected: boolean) => JSX.Element;
    errorText?: string;
}


export interface AutoCompleterState<M extends ToString> {
    currentIndex: number
    open: boolean;
    input: string | undefined;
    results: M[] | undefined;
    isFetching: boolean;
    showLoader: boolean;
    selected: M | undefined;
    placeholderActive: boolean;
}

export class AutoCompleter<M extends ToString> extends React.PureComponent<AutoCompleterProps<M>, AutoCompleterState<M>> {

    input = React.createRef<HTMLInputElement>()
    dropdown = React.createRef<HTMLDivElement>()

    private _name: string;

    constructor(props: AutoCompleterProps<M>) {
        super(props);
        this.state = {
            currentIndex: this.props.index || 0,
            open: has(this.props, 'open') || false,
            input: props.value ? props.value.toString() : void 0,
            results: void 0,
            isFetching: false,
            showLoader: false,
            selected: props.value,
            placeholderActive: false
        };

        this._name = String.fromCharCode(65 + Math.floor(Math.random() * 26)) + Date.now() + this.props.name || '';

    }

    componentDidUpdate(prevProps: AutoCompleterProps<M>, _prevState: AutoCompleterState<M>) {
        if (prevProps.value != this.props.value) {
            this.setState({
                input: this.props.value ? this.props.value.toString() : void 0,
                selected: this.props.value,
            })
        }
    }

    render() {

        const dropdown = this._getDropdown();

        let classNames = ['autocomplete-inner'];
        if (this.state.input || this.state.placeholderActive) classNames.push('placeholder-active');
        if (this.props.showClearButton) classNames.push('has-reset')


        return <div className={`autocomplete ${this.state.open ? 'open' : ''}` + (this.state.results && this.state.results!.length > 0 ? ' has-results' : '')}>
            <div
                className={classNames.join(' ')}
                data-placeholder={this.props.placeholder}>
                {
                    this.props.showClearButton ?
                        this.state.input ? <img
                            style={{ cursor: 'pointer' }}
                            src="/static/skuffesalg/images/search-delete.svg"
                            onClick={this._reset}
                        /> : <img src="/static/skuffesalg/images/search-icon.svg" />
                        : void 0
                }
                <div className={`input__wrap ${(this.state.input || this.state.placeholderActive) ? 'placeholder-active' : ''}`}>
                    <input
                        ref={this.input}
                        type="text"
                        name={this._name}
                        className="input"
                        id={this._name}
                        value={this.state.input || ''}
                        autoFocus={this.props.autoFocus}
                        autoComplete={this._name}
                        disabled={this.props.disabled}
                        onChange={e => {
                            this._open();
                            this.setState({ input: e.target.value }, () => {
                                if (this.state.isFetching) {
                                    this._fetchData()
                                } else {
                                    this._doQuery(this.state.input || '');
                                }
                            });
                        }}
                        onFocus={() => this.setState({ placeholderActive: true })}
                        onBlur={() => {
                            this.setState({ placeholderActive: false })
                        }}
                        onKeyDown={this._onKeyDown}
                    />
                    <label htmlFor={this._name} className="placeholder">{this.props.placeholder}</label>
                </div>

            </div>
            {dropdown && <div ref={this.dropdown} className="autocomplete-dropdown">{dropdown}</div>}
        </div>
    }

    @bind
    private _onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        let scrollAmount = 36;

        switch (e.keyCode) {
            case KeyCode.Up:
                e.preventDefault();
                this.state.currentIndex >= 0 && this.setState({ currentIndex: this.state.currentIndex - 1 });
                if (this.state.currentIndex > 4) {
                    this.dropdown.current!.scrollTop -= scrollAmount;
                }
                break;

            case KeyCode.Tab:
                // Ignore tab, if the dropdown is not open
                if (!this.state.open) return;
            case KeyCode.Down:
                e.preventDefault();
                if (e.shiftKey) {
                    this.state.currentIndex > 0 && this.setState({ currentIndex: this.state.currentIndex - 1 });
                } else {
                    const result = this.state.results || [];
                    this.state.currentIndex < (result.length - 1) && this.setState({ currentIndex: this.state.currentIndex + 1 });

                    if (this.state.currentIndex === 4) {
                        this.dropdown.current!.scrollTop = 15;
                    }
                    if (this.state.currentIndex > 4) {
                        this.dropdown.current!.scrollTop += scrollAmount;
                    }
                }
                break;
            case KeyCode.Escape:
                e.preventDefault();
                this._close(() => this.input.current!.blur(), true);

                break;
            case KeyCode.Return:
                // let list = this.state.input ? this.state.results : this.recentSearch.entries.reverse();
                const list = this.state.results || [];
                const current = list[this.state.currentIndex];
                this._onSelection(current);
                break;
        }
    }

    private _getDropdown() {
        if (!this.state.open || (!this.state.input || this.state.input!.length === 1)) return;


        const list = this.state.results! || []

        if (this.state.showLoader || (this.state.isFetching && list.length == 0)) {
            return <div className="autocomplete-dropdown__inner">
                <div className="loader">
                    <div className="loader__wrapper">
                        <span className="loader--spinner"></span>
                    </div>
                </div>
            </div>
        }

        if (list.length === 0 && !this.state.showLoader && !this.state.selected && (this.state.input || '').length >= 2) {
            return <div className="autocomplete-dropdown__inner">
                <div className="not-found">
                    {this.props.errorText || ''}
                </div>
            </div>
        } else if (!list.length || (this.state.input || '').length < 2) return void 0;

        const input = (this.state.input! as string).trim();

        return <div className="autocomplete-dropdown__inner">
            <ul className="autocomplete-list">
                {list.map((m, i) => {
                    if (isFunction(this.props.buildItem))
                        return <li
                            className={i === this.state.currentIndex ? 'selected' : ''}
                            onClick={_ => this._onSelection(m)}
                            key={(m as any).key || (m as any).id || m.toString()}>
                            {this.props.buildItem(m, i === this.state.currentIndex)}
                        </li>
                    return <AutoCompleteItem
                        selected={i === this.state.currentIndex}
                        entry={m}
                        input={input}
                        key={(m as any).key || (m as any).id || m.toString()}
                        onClick={_ => this._onSelection(m)}
                    />
                })}
            </ul>
        </div>

    }

    private _onBodyClicked(e: Event) {
        if ((e.target as HTMLElement).classList.contains('.autocomplete')) return;
        let parent = (e.target as HTMLElement).parentElement;

        while (parent && parent.tagName != 'BODY') {
            if (parent.classList.contains('autocomplete'))
                return;
            parent = parent.parentElement;
        }

        this._close(void 0);
    }


    @bind
    private _onSelection(entry: M) {

        if (isFunction(this.props.onSelect)) {
            this.props.onSelect(entry);
        }

        this._close()
        this.setState({ input: entry.toString(), selected: entry });
    }


    private _open() {
        // Already open
        if (this.state.open) return;

        //
        document.querySelector('html')!.style.overflow = 'hidden';
        document.body!.removeEventListener('click', this._onBodyClicked);
        document.body!.addEventListener('click', this._onBodyClicked);

        // html('html')
        //     .addClass('overflow--hidden');

        this.setState({ open: true });

        // html(document.body).off('click', this._onBodyClicked, this);
        // html(document.body)
        //     .on('click', this._onBodyClicked, false, this);
    }

    private _clear(cb?: () => any) {
        this.setState({ input: '', results: [], isFetching: false, showLoader: false, selected: void 0 }, cb);
    }

    @bind
    private _close(cb?: () => any, clear: boolean = false) {
        // html(document.body)
        //     .off('click', this._onBodyClicked, this);

        document.body!.removeEventListener('click', this._onBodyClicked);


        if (clear)
            this._clear(() => this.setState({ open: false }, cb));
        else {
            let input = this.state.input ? this.state.selected ? this.state.selected.toString() : '' : '';
            if (!input && this.state.selected) {
                this._reset();
            } else {
                this.setState({ open: false, input: input, selected: input ? this.state.selected : void 0 });
            }

        }


        if (this.props.onClose) {
            this.props.onClose();
        }


    }

    @bind
    private _reset() {
        this._close(this.props.onReset, true)
    }


    private _doQuery(query: string) {
        let done: number | undefined;
        // We only wants to show the loader
        // if the request takes more than ~500 ms.
        const timer = setTimeout(() => {
            done = +new Date();
            this.setState({ showLoader: true });
        }, 500);

        if (!this.state.isFetching) {
            this.setState({ isFetching: true });
        } else {
            this.setState({ isFetching: false });
        }

        resolve(this.props.requestQuery, query).then(results => {
            clearTimeout(timer);
            this.setState({ showLoader: false })

            if (results.length === 0) {
                this.setState({ isFetching: false });
            }

            if (!this.state.showLoader)
                this.setState({ results, open: true })
            else {
                let diff = (+new Date) - done!;
                if (diff < 1000) {
                    setTimeout(() => {
                        this.setState({ results })
                    }, 500);
                } else {
                    this.setState({ results })
                }
            }
        }, e => {
            clearTimeout(timer);
            console.log('Got error from backend', e);
            this.setState({ showLoader: false, isFetching: false, results: [] });
        });

        if (query === '') {
            setTimeout(() => {
                this.setState({ open: false })
            }, 0);
        }

    }

    @debounce(500)
    _fetchData() {
        this._doQuery(this.state.input!);
    }

}