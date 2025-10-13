import { StyleSheet, Text, View, ActivityIndicator, Pressable } from 'react-native'
import React from 'react'

const Loading = ({ changeIsLoading, message = 'Lütfen bekle...' }) => {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Pressable
          onPress={changeIsLoading}
          style={styles.closeButtonContainer}
          accessibilityRole="button"
          accessibilityLabel="Yüklemeyi kapat"
        >
          <Text style={styles.closeButton}>X</Text>
        </Pressable>

        <ActivityIndicator size="large" color="#0eb37d" style={styles.spinner} />
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  )
}

export default Loading

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(4, 21, 35, 0.45)',
    paddingHorizontal: 24,
    zIndex: 999,
  },
  card: {
    width: '100%',
    maxWidth: 260,
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#041523',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 25,
    elevation: 10,
  },
  spinner: {
    marginTop: 16,
  },
  message: {
    marginTop: 22,
    fontSize: 16,
    fontWeight: '600',
    color: '#041523',
    textAlign: 'center',
  },
  closeButtonContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(4, 21, 35, 0.08)',
  },
  closeButton: {
    color: '#041523',
    fontSize: 16,
    fontWeight: '700',
  },
})
