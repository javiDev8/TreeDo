import React, { Component } from 'react'
import {
    TextInput,
    CheckBox,
    Text,
    View,
    TouchableOpacity,
    Pressable,
} from 'react-native'
import Swipeable from 'react-native-gesture-handler/Swipeable'
import EventBus from 'react-native-event-bus'

import db from './database'
import downRecursive from './downRecursive'
import check from './dbControllers/check'
import remove from './dbControllers/remove'
import insert from './dbControllers/insert'
import update from './dbControllers/update'

export default class Item extends Component {
    state = {
        children: [],
        childrenAmount: 0,
        doneChildrenAmount: 0,
        textContent: '',

        editing: false,
        showOptions: false,
        showInput: false,
        open: false,
        done: false,
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

    add = textContent =>
        insert(this.props.id, textContent).then(insertId => {
            this.setState({
                children: this.state.children.concat({
                    id: insertId,
                    parentId: this.props.parentId,
                    textContent: textContent,
                }),
            })
            this.inputRef.clear()
            this.setChildren(1, 0)
            if (this.props.parentId > 0) this.upCheck()
        })

    remove = () => {
        downRecursive(this.props.id, 'delete from items where id = ?')
        this.props.updateParent()
    }

    update = () => {
        console.log('on this.update')
        update(this.props.id, this.state.textContent)
        this.setState({ editing: false })
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
        if (this.props.parentId > 0) {
            this.props.setParentChildren(0, this.state.done ? 1 : -1)
            await this.props.upCheck()
        }
        this.props.checkOnParentArray(this.props.id)
    }

    upCheck = async () => {
        let previousDoneState = this.state.done
        let allDone =
            this.state.childrenAmount === this.state.doneChildrenAmount &&
            this.state.childrenAmount > 0
        await this.setState({ done: allDone })
        if (this.state.done === previousDoneState || this.props.parentId === 0)
            return
        this.props.setParentChildren(0, this.state.done ? 1 : -1)
        check(this.props.id, this.state.done)
        await this.props.upCheck()
        this.props.checkOnParentArray(this.props.id)
    }

    setChildren = (childrenUnit, doneChildrenUnit) =>
        this.setState({
            childrenAmount: this.state.childrenAmount + childrenUnit,
            doneChildrenAmount:
                this.state.doneChildrenAmount + doneChildrenUnit,
        })

    remove = async () => {
        downRecursive(this.props.id, id => remove(id))
        this.props.removeFromParentArray(this.props.id)
        await this.props.setParentChildren(-1, this.state.done ? -1 : 0)
        this.props.upCheck()
    }

    open = () => {
        this.fetchChildren()
        this.setState({ open: true, showInput: true })
        EventBus.getInstance().fireEvent('open', { id: this.props.id })
    }

    render() {
        return (
            <View>
                {this.props.id === 0 ? (
                    this.state.showInput ? null : (
                        <TouchableOpacity
                            onPress={() => this.setState({ showInput: true })}
                        >
                            <Text style={{ fontSize: 20, marginBottom: 15 }}>
                                add list
                            </Text>
                        </TouchableOpacity>
                    )
                ) : (
                    <Swipeable
                        ref={c => (this.swipeableRef = c)}
                        renderLeftActions={() => <Text>{'   '}</Text>}
                        renderRightActions={() => <Text>{'   '}</Text>}
                        onSwipeableRightWillOpen={() => {
                            this.setState({ open: false })
                            this.swipeableRef.close()
                        }}
                        onSwipeableLeftWillOpen={() => {
                            this.open()
                            this.swipeableRef.close()
                        }}
                    >
                        <Pressable
                            onLongPress={() =>
                                this.setState({ showOptions: true })
                            }
                            delayLongPress={200}
                            style={{ flexDirection: 'row' }}
                        >
                            {this.props.parentId > 0 ? (
                                <CheckBox
                                    value={this.state.done}
                                    onValueChange={this.check}
                                />
                            ) : null}
                            {this.state.editing ? (
                                <TextInput
                                    multiline={true}
                                    style={{ fontSize: 20 }}
                                    autoFocus={true}
                                    value={this.state.textContent}
                                    onChangeText={val =>
                                        this.setState({ textContent: val })
                                    }
                                    onSubmitEditing={this.update}
                                />
                            ) : (
                                <Text
                                    style={
                                        this.state.done
                                            ? {
                                                  fontSize: 20,
                                                  textDecorationLine:
                                                      'line-through',
                                                  fontStyle: 'italic',
                                              }
                                            : { fontSize: 20 }
                                    }
                                >
                                    {this.state.textContent || null}
                                </Text>
                            )}
                        </Pressable>
                    </Swipeable>
                )}
                {this.state.showOptions ? (
                    <View style={{ flexDirection: 'row' }}>
                        <TouchableOpacity
                            onPress={this.remove}
                            style={{ marginLeft: 8 }}
                        >
                            <Text style={{ fontSize: 20 }}>Delete</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => this.setState({ editing: true })}
                            style={{ marginLeft: 8 }}
                        >
                            <Text style={{ fontSize: 20 }}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() =>
                                this.setState({ showOptions: false })
                            }
                            style={{ marginLeft: 8 }}
                        >
                            <Text style={{ fontSize: 20 }}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                ) : null}

                {this.state.open ? (
                    <View style={{ paddingLeft: this.props.id > 0 ? 20 : 0 }}>
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
                                    checkOnParentArray={this.checkOnArray}
                                    removeFromParentArray={this.removeFromArray}
                                />
                            ))}

                        {this.state.showInput ? (
                            <TextInput
                                multiline={false}
                                ref={c => (this.inputRef = c)}
                                style={{ marginLeft: 5, fontSize: 20 }}
                                onSubmitEditing={({ nativeEvent }) =>
                                    this.add(nativeEvent.text)
                                }
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
                                    checkOnParentArray={this.checkOnArray}
                                    removeFromParentArray={this.removeFromArray}
                                />
                            ))}
                    </View>
                ) : null}
            </View>
        )
    }

    checkOnArray = id =>
        this.setState({
            children: this.state.children.map(item => {
                if (item.id === id) item.done = !item.done
                return item
            }),
        })

    removeFromArray = id =>
        this.setState({
            children: this.state.children.filter(item => item.id !== id),
        })
}
