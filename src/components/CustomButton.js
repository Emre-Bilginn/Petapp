import { StyleSheet, Text, Pressable } from 'react-native'
import React from 'react'

const CustomButton = ({
  buttonText,
  setWidth,
  handleOnPress,
  buttonColor,
  pressedButtonColor,
  isDisabled = false,
}) => {
  const backgroundColor = isDisabled ? 'rgba(4, 21, 35, 0.25)' : buttonColor

  return (
    <Pressable
      onPress={handleOnPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        {
          backgroundColor: pressed && !isDisabled ? pressedButtonColor : backgroundColor,
          width: setWidth,
          opacity: isDisabled ? 0.7 : 1,
        },
        styles.button,
      ]}
    >
      <Text style={styles.buttonText}>{buttonText}</Text>
    </Pressable>
  )
}

export default CustomButton

const styles = StyleSheet.create({
  button: {
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  buttonText: {
    fontWeight: 'bold',
    color: 'white',
  },
})
