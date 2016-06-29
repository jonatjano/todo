'use babel';

import React, {PropTypes} from 'react';
import Header from './Header';
import List from './List';
import Empty from './Empty';
import Status from './Status';
import Search from './Search';

class Container extends React.Component {
    static get propTypes() {
        return {
            onRefresh: PropTypes.func.isRequired,
            onClose: PropTypes.func.isRequired,
            onItemClick: PropTypes.func.isRequired,
            items: PropTypes.array.isRequired,
            loading: PropTypes.bool.isRequired,
            pathsSearched: PropTypes.number,
        };
    }

    constructor() {
        super();
        this.onSearchChanged = this.onSearchChanged.bind(this);

        this.state = {
            searchValue: null,
        };
    }

    render() {
        const {props} = this;
        const filteredItems = this.getFilteredItems(props.items, this.state.searchValue);
        return (
          <atom-panel className='right'>
              <div className='padded'>
                <div className='inset-panel'>
                    <div className='panel-heading'>
                      <Header
                          onRefresh={props.onRefresh}
                          onClose={props.onClose}
                          count={props.items && props.items.length}
                      />

                      {
                          !props.loading
                          &&
                          <Search
                              onChange={this.onSearchChanged}
                          />
                      }
                    </div>
                    <div className='panel-body padded'>
                        <Status
                            loading={props.loading}
                            pathsSearched={props.pathsSearched}
                        />
                        {
                            !props.loading
                            && (
                                props.items.length
                                ? <List
                                    items={filteredItems}
                                    onItemClick={props.onItemClick}
                                />
                                : <Empty />
                            )
                        }
                    </div>
                </div>
            </div>
          </atom-panel>
        );
    }

    getFilteredItems(items, searchValue) {
        if (!searchValue) {
            return items;
        } else {
            const filtered = [];

            items.map(item => {
                const filteredMatches = item.matches.filter(match => {
                    return match.matchText.indexOf(searchValue) > -1;
                });

                if (filteredMatches.length) {
                    filtered.push(
                        Object.assign({}, item, {
                            matches: filteredMatches,
                        })
                    );
                }
            });

            return filtered;
        }
    }

    onSearchChanged(event) {
        const {target: { value: searchValue }} = event;
        this.setState({ searchValue });
    }
}

export default Container;
