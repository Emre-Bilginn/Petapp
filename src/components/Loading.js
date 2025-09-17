import { StyleSheet, Text, View, ActivityIndicator, Pressable } from 'react-native'
import React from 'react'

const Loading = (props) => {
  return (
    <View style={styles.container}>
        <Pressable
        onPress={() => props.changeIsLoading()}
        style={[{},styles.closeButtonContainer]}>
            <Text style={styles.closeButton}>X</Text>
        </Pressable>
        <ActivityIndicator size={"large"} color={"blue"}/>
      <Text style={styles.loginText} >Loading...</Text>
    </View>
  )
}

export default Loading

const styles = StyleSheet.create({
    container:{
        position:"absolute",
        width:"100%",
        height:"100%",
        alignItems:"center",
        justifyContent:"center",
        backgroundColor:"lightblue"
    },
    loginText:{
        fontWeight:"400",
        fontSize:20,
        marginTop:20
    },
    closeButton:{
        color:"white",
        fontWeight:"bold",
        fontSize:16
    },
    closeButtonContainer:{
        backgroundColor:"black",
        width:50,
        height:50,
        alignItems:"center",
        justifyContent:"center",
        borderRadius:50,
        position:"absolute",
        top:50,
        right:20
    }
})