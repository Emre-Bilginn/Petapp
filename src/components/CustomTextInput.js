import { StyleSheet, Text, View, TextInput } from 'react-native'
import React from 'react'

const CustomTextInput = ({
  title,
  isSecureText,
  handleOnChangeText,
  handleValue,
  handlePlaceHolder,
  keyboardType,
  helperText,
  error,
  containerStyle,
  inputStyle,
  ...rest
}) => {
  return (
    <View style={[styles.inputContainer, containerStyle]}>
      {title ? <Text style={styles.inputBoxText}>{title}</Text> : null}
      <TextInput
        secureTextEntry={isSecureText}
        placeholder={handlePlaceHolder}
        placeholderTextColor="rgba(6, 24, 40, 0.45)"
        style={[
          styles.textInputStyle,
          error ? styles.inputError : null,
          inputStyle,
        ]}
        onChangeText={handleOnChangeText}
        value={handleValue}
        keyboardType={keyboardType}
        {...rest}
      />
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  )
}

export default CustomTextInput

const styles = StyleSheet.create({
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  textInputStyle: {
    borderWidth: 1,
    borderColor: 'rgba(6, 24, 40, 0.15)',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    color: '#041523',
    width: '100%',
    height: 54,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 16,
  },
  inputError: {
    borderColor: '#e53935',
  },
  inputBoxText: {
    fontWeight: '600',
    color: '#0f2740',
    marginBottom: 8,
  },
  helperText: {
    marginTop: 8,
    color: 'rgba(6, 24, 40, 0.6)',
    fontSize: 12,
  },
  errorText: {
    marginTop: 8,
    color: '#e53935',
    fontSize: 12,
    fontWeight: '600',
  },
})
