import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

const LostPetsList = ({ navigation }) => {
  const [pets, setPets] = useState([]);

  useEffect(() => {
    const fetchPets = async () => {
      try {
        const petCollection = await getDocs(collection(db, 'lost_pets'));
        const petList = petCollection.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setPets(petList);
      } catch (error) {
        console.error('İlanlar alınırken bir hata oluştu: ', error);
      }
    };

    fetchPets();
  }, []);

  const renderPetItem = ({ item }) => (
    <View style={styles.petCard}>
      <Image source={{ uri: item.image }} style={styles.petImage} />
      <Text style={styles.petName}>{item.name}</Text>
      <Text>{item.description}</Text>
      <Text>İletişim: {item.contact}</Text>
      <TouchableOpacity
        style={styles.detailsButton}
        onPress={() => navigation.navigate('PetDetails', { petId: item.id })}
      >
        <Text style={styles.detailsButtonText}>Detayları Gör</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={pets}
        renderItem={renderPetItem}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  petCard: {
    marginBottom: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  petImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  petName: {
    fontWeight: 'bold',
    fontSize: 18,
    marginVertical: 8,
  },
  detailsButton: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  detailsButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default LostPetsList;
