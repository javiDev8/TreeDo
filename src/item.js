import React, { Component } from 'react'
import { TextInput, CheckBox, Text, View, TouchableOpacity } from 'react-native'
import Swipeable from 'react-native-gesture-handler/Swipeable'
import EventBus from 'react-native-event-bus'

import db from './database'
import downRecursive from './downRecursive'

export default class Item extends Component {
    state = {
        children: [],
        showInput: false,
        newItemTextContent: '',
        childrenAmount: 0,
        doneChildrenAmount: 0,

        open: false,
        done: false,
        textContent: '',
    }

    componentDidMount() {
        this.setState(this.props.data)
        if (this.props.id === 0) this.open()
        EventBus.getInstance().addListener(
            'open',
            (this.listener = data => {
                if (data.id !== this.props.id)
                    this.setState({ showInput: false })
            })
        )
    }

    componentWillUnmount() {
        console.log('componentWillUnmount, id: ', this.props.id)
        EventBus.getInstance().removeListener(this.listener)
    }

    add = () => {
        db.transaction(
            tx => {
                tx.executeSql(
                    `insert into items (
		    parentId,
		    textContent
		) values (?,?)`,
                    [this.props.id, this.state.newItemTextContent],
                    (_, result) =>
                        this.setState({
                            children: this.state.children.concat({
                                id: result.insertId,
                                parentId: this.props.id,
                                textContent: this.state.newItemTextContent,
                            }),
                        }),
                    (_, error) => console.log('error on insert: ', error)
                )
                tx.executeSql(
                    'update items set childrenAmount = ? where id = ?',
                    [this.state.childrenAmount + 1, this.props.id],
                    null,
                    (_, error) =>
                        console.log('error on +1 childrenAmount: ', error)
                )
            },
            null,
            () =>
                this.setState({
                    newItemTextContent: '',
                    childrenAmount: this.state.childrenAmount + 1,
                })
        )
    }

    remove = () => {
        downRecursive(this.props.id, 'delete from items where id = ?')
        this.props.updateParent()
    }

    fetchChildren = () => {
        db.transaction(tx =>
            tx.executeSql(
                'select * from items where parentId = ?',
                [this.props.id],
                (_, { rows }) => {
                    console.log('match on fetch: ', rows._array)
                    this.setState({
                        children: rows._array.map(item => {
                            item.done = item.done === 1 ? true : false
                            return item
                        }),
                        // childrenAmount: rows._array.length,
                    })
                },
                null
            )
        )
    }

    open = () => {
        this.fetchChildren()
        this.setState({ open: true, showInput: true })
        EventBus.getInstance().fireEvent('open', { id: this.props.id })
    }

    render() {
        return (
            <View>
                {this.props.id === 0 ? null : (
                    <Swipeable
                        ref={c => (this.swipeableRef = c)}
		    renderLeftActions={() => <Text>{'>'}</Text>}
                        renderRightActions={() => (
                            <TouchableOpacity
                                onPress={() => console.log('handle options')}
                            >
                                <Text>O</Text>
                            </TouchableOpacity>
                        )}
                        onSwipeableLeftWillOpen={this.open}
			onSwipeableWillClose={() => this.setState({ open: false })}
                    >
                        <View style={{ flexDirection: 'row' }}>
                            {this.state.childrenAmount > 0 ? (
				null
                            ) : (
                                <CheckBox />
                            )}
                            <Text>
                                {(this.state.textContent || null) +
                                    ` (${this.state.childrenAmount})`}
                            </Text>
                        </View>
                    </Swipeable>
                )}

                {this.state.open ? (
                    <View style={{ paddingLeft: 20 }}>
                        {this.state.children
                            .filter(item => !item.done)
                            .map(item => (
                                <Item
                                    key={item.id}
                                    data={item}
                                    id={item.id}
                                    parentId={this.props.id}
                                    updateParent={this.fetchChildren}
                                />
                            ))}

                        {this.state.showInput ? (
                            <TextInput
                                value={this.state.newItemTextContent}
                                onChangeText={val =>
                                    this.setState({ newItemTextContent: val })
                                }
                                onSubmitEditing={this.add}
                                placeholder="add item"
                            />
                        ) : null}
                    </View>
                ) : null}
            </View>
        )
    }
}
