import React, { Component } from 'react'
import { TextInput, CheckBox, Text, View, TouchableOpacity } from 'react-native'
import Swipeable from 'react-native-gesture-handler/Swipeable'
import EventBus from 'react-native-event-bus'

import db from './database'
import downRecursive from './downRecursive'
import check from './dbControllers/check'

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
        EventBus.getInstance().removeListener(this.listener)
    }

    add = () => {
        db.transaction(tx => {
            tx.executeSql(
                `insert into items (
		    parentId,
		    textContent
		) values (?,?)`,
                [this.props.id, this.state.newItemTextContent],
                (_, result) => {
                    this.setState({
                        children: this.state.children.concat({
                            id: result.insertId,
                            parentId: this.props.id,
                            textContent: this.state.newItemTextContent,
                        }),
                        newItemTextContent: '',
                    }),
                        this.setChildren(1, 0)
                    if (this.props.parentId > 0) this.upCheck()
                },
                (_, error) => console.log('error on insert: ', error)
            )
        })
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
                    let doneLength = rows._array.filter(item => item.done === 1)
                        .length
                    this.setState({
                        children: rows._array.map(item => {
                            item.done = item.done === 1 ? true : false
                            return item
                        }),
                        childrenAmount: rows._array.length,
                        doneChildrenAmount: doneLength,
                    })
                },
                null
            )
        )
    }

    check = async () => {
        await this.setState({
            done: !this.state.done,
            doneChildrenAmount: this.state.done ? 0 : this.state.childrenAmount,
        })
        downRecursive(this.props.id, id => check(id, this.state.done))
        this.props.setParentChildren(0, this.state.done ? 1 : -1)
        await this.props.upCheck()
        this.props.checkOnParentArray(this.props.id)
    }

    upCheck = async () => {
        console.log(
            `on upCheck, item: ${this.state.textContent},
	    childrenAmount: ${this.state.childrenAmount},
	    doneChildrenAmount: ${this.state.doneChildrenAmount}`
        )
        let previousDoneState = this.state.done
        let allDone =
            this.state.childrenAmount === this.state.doneChildrenAmount &&
            this.state.childrenAmount > 0
        await this.setState({ done: allDone })
        if (this.state.done === previousDoneState || this.props.parentId === 0)
            return
        console.log('lets recursive on upCheck')
        this.props.setParentChildren(0, this.state.done ? 1 : -1)
        check(this.props.id, this.state.done)
        this.props.upCheck()
    }

    setChildren = (childrenUnit, doneChildrenUnit) => {
        this.setState({
            childrenAmount: this.state.childrenAmount + childrenUnit,
            doneChildrenAmount:
                this.state.doneChildrenAmount + doneChildrenUnit,
        })
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
                        onSwipeableRightWillOpen={() =>
                            this.setState({ open: false })
                        }
                        onSwipeableLeftWillOpen={() => {
                            this.open()
                            this.swipeableRef.close()
                        }}
                    >
                        <View style={{ flexDirection: 'row' }}>
                            <CheckBox
                                value={this.state.done}
                                onValueChange={this.check}
                            />
                            <Text>
                                {(this.state.textContent || null) +
                                    ` (${this.state.doneChildrenAmount}/${this.state.childrenAmount})`}
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
                                    setParentChildren={this.setChildren}
                                    upCheck={this.upCheck}
                                    checkOnParentArray={id =>
                                        this.setState({
                                            children: this.state.children.map(
                                                item => {
                                                    if (item.id === id)
                                                        item.done = !item.done
                                                    return item
                                                }
                                            ),
                                        })
                                    }
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
                        {this.state.children
                            .filter(item => item.done)
                            .map(item => (
                                <Item
                                    key={item.id}
                                    data={item}
                                    id={item.id}
                                    parentId={this.props.id}
                                    setParentChildren={this.setChildren}
                                    upCheck={this.upCheck}
                                    checkOnParentArray={id =>
                                        this.setState({
                                            children: this.state.children.map(
                                                item => {
                                                    if (item.id === id)
                                                        item.done = !item.done
                                                    return item
                                                }
                                            ),
                                        })
                                    }
                                />
                            ))}
                    </View>
                ) : null}
            </View>
        )
    }
}
