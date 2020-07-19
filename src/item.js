import React, { Component } from 'react'
import { TextInput, CheckBox, Text, View, TouchableOpacity } from 'react-native'
import Swipeable from 'react-native-gesture-handler/Swipeable'

import db from './database'

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
        if (this.props.id === 0) this.fetchChildren()
    }

    add = () => {
        db.transaction(
            tx =>
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
                ),
            null,
            () => this.setState({ showInput: false, newItemTextContent: '' })
        )
    }

    fetchChildren = () => {
        db.transaction(
            tx =>
                tx.executeSql(
                    'select * from items where parentId = ?',
                    [this.props.id],
                    (_, { rows }) => {
                        this.setState({
                            children: rows._array.map(item => {
                                item.done = item.done === 1 ? true : false
                                item.open = item.open === 1 ? true : false
                                return item
                            }),
                        })
                    },
                    null
                )
            // null,
            // () => console.log('children after fetch: ', this.state.children)
        )
    }

    open = () => {
        db.transaction(
            tx =>
                tx.executeSql(
                    'update items set open = 1 where id = ?',
                    [this.props.id],
                    null,
                    null
                ),
            null,
            () => {
                this.setState({ open: true })
                this.fetchChildren()
            }
        )
    }

    close = () => {
        db.transaction(
            tx =>
                tx.executeSql(
                    'update items set open = 0 where id = ?',
                    [this.props.id],
                    null,
                    null
                ),
            null,
            () => this.setState({ open: false })
        )
    }

    render() {
        return (
            <View>
                {this.props.id === 0 ? (
                    <TouchableOpacity
                        onPress={() => this.setState({ showInput: true })}
                    >
                        <Text>add root task</Text>
                    </TouchableOpacity>
                ) : null}

                <Swipeable
                    renderLeftActions={() => (
                        <TouchableOpacity
                            onPress={() => this.setState({ showInput: true })}
                        >
                            <Text>+ </Text>
                        </TouchableOpacity>
                    )}
                    onSwipeableWillOpen={this.open}
                    onSwipeableWillClose={this.close}
                >
                    <Text>{this.state.textContent || null}</Text>
                </Swipeable>

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
                                />
                            ))}

                        {this.state.showInput ? (
                            <TextInput
                                value={this.state.newItemTextContent}
                                onChangeText={val =>
                                    this.setState({ newItemTextContent: val })
                                }
                                onSubmitEditing={this.add}
                                autoFocus={true}
                                placeholder="add item"
                            />
                        ) : null}
                    </View>
                ) : null}
            </View>
        )
    }
}
