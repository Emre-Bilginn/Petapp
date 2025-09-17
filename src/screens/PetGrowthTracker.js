import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { collection, doc, addDoc, getDocs, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { Picker } from '@react-native-picker/picker';

const screenWidth = Dimensions.get('window').width;

const PetGrowthTracker = () => {
  const [pets, setPets] = useState([]);
  const [selectedPet, setSelectedPet] = useState(null);
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [growthData, setGrowthData] = useState([]);
  const [newPetName, setNewPetName] = useState('');
  const [graphType, setGraphType] = useState('both');

  // Firestore'dan evcil hayvanları getir
  const fetchPets = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'pets'));
      const petsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPets(petsList);
    } catch (error) {
      console.error('Evcil hayvanlar alınırken bir hata oluştu:', error);
    }
  };

  // Yeni evcil hayvan ekle
  const addNewPet = async () => {
    if (!newPetName.trim()) {
      alert("Lütfen evcil hayvanın adını girin!");
      return;
    }

    try {
      await addDoc(collection(db, 'pets'), {
        name: newPetName,
        data: [],
      });
      alert("Evcil hayvan başarıyla eklendi!");
      setNewPetName('');
      fetchPets();
    } catch (error) {
      console.error('Evcil hayvan eklenirken bir hata oluştu:', error);
      alert("Evcil hayvan eklenirken bir hata oluştu: " + error.message);
    }
  };

  // Evcil hayvan seçimi
  const selectPet = (pet) => {
    setSelectedPet(pet);
    setGrowthData(pet?.data || []); // Null kontrolü eklendi
  };

  // Yeni büyüme verisi ekle
  const addGrowthData = async () => {
    if (!selectedPet || (!weight && !height)) {
      alert("Lütfen bir evcil hayvan seçin ve kilo/boy bilgisi girin!");
      return;
    }

    const parsedWeight = weight ? parseFloat(weight) : null;
    const parsedHeight = height ? parseFloat(height) : null;

    if ((weight && isNaN(parsedWeight)) || (height && isNaN(parsedHeight))) {
      alert("Lütfen geçerli bir kilo ve boy değeri girin!");
      return;
    }

    const newEntry = {
      date: new Date().toISOString().split('T')[0],
      weight: parsedWeight,
      height: parsedHeight,
    };

    try {
      const petRef = doc(db, 'pets', selectedPet.id);
      await updateDoc(petRef, {
        data: arrayUnion(newEntry),
      });

      const updatedGrowthData = [...growthData, newEntry];
      setGrowthData(updatedGrowthData);

      const updatedPets = pets.map(pet =>
        pet.id === selectedPet.id ? { ...pet, data: updatedGrowthData } : pet
      );
      setPets(updatedPets);

      setWeight('');
      setHeight('');
    } catch (error) {
      console.error('Veri eklenirken bir hata oluştu:', error);
    }
  };

  useEffect(() => {
    fetchPets();
  }, []);

  // Grafik verilerini hazırla
  const getChartData = () => {
    const labels = growthData.map((entry) => entry.date);
    let datasets = [];

    if (graphType === 'weight' || graphType === 'both') {
      const weightData = growthData
        .map((entry) => entry.weight)
        .filter((val) => val !== null && !isNaN(val));
      if (weightData.length > 0) {
        datasets.push({
          data: weightData,
          color: () => 'rgba(75, 192, 192, 1)',
          label: 'Kilo',
        });
      }
    }

    if (graphType === 'height' || graphType === 'both') {
      const heightData = growthData
        .map((entry) => entry.height)
        .filter((val) => val !== null && !isNaN(val));
      if (heightData.length > 0) {
        datasets.push({
          data: heightData,
          color: () => 'rgba(255, 159, 64, 1)',
          label: 'Boy',
        });
      }
    }

    return { labels, datasets };
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pet Growth Tracker</Text>

      {/* Yeni Evcil Hayvan Ekleme */}
      <View style={styles.formContainer}>
        <TextInput
          placeholder="Evcil hayvanın adı"
          value={newPetName}
          onChangeText={setNewPetName}
          style={styles.input}
        />
        <Button title="Evcil Hayvan Ekle" onPress={addNewPet} color="purple" />
      </View>

      {/* Evcil Hayvan Listesi */}
      <FlatList
        data={pets}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Button
            title={item.name}
            onPress={() => selectPet(item)}
            color={selectedPet?.id === item.id ? 'green' : 'blue'}
          />
        )}
        horizontal
        style={styles.petList}
      />

      {/* Veri Ekleme Formu */}
      {selectedPet && (
        <View style={styles.formContainer}>
          <Text style={styles.subtitle}>Kilo ve Boy Verisi Ekle ({selectedPet.name})</Text>
          <TextInput
            placeholder="Kilo (kg)"
            value={weight}
            onChangeText={setWeight}
            keyboardType="numeric"
            style={styles.input}
          />
          <TextInput
            placeholder="Boy (cm)"
            value={height}
            onChangeText={setHeight}
            keyboardType="numeric"
            style={styles.input}
          />
          <Button title="Veri Ekle" onPress={addGrowthData} color="green" />
        </View>
      )}

      {/* Grafik Türü Seçimi */}
      <View style={styles.formContainer}>
        <Text style={styles.subtitle}>Grafik Türü</Text>
        <Picker
          selectedValue={graphType}
          onValueChange={(itemValue) => setGraphType(itemValue)}
        >
          <Picker.Item label="Her ikisi" value="both" />
          <Picker.Item label="Sadece Kilo" value="weight" />
          <Picker.Item label="Sadece Boy" value="height" />
        </Picker>
      </View>

      {/* Grafik */}
      {growthData.length > 0 && (
        <LineChart
          data={getChartData()}
          width={screenWidth - 40}
          height={220}
          chartConfig={{
            backgroundColor: '#1cc910',
            backgroundGradientFrom: '#eff3ff',
            backgroundGradientTo: '#efefef',
            decimalPlaces: 2,
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: { borderRadius: 16 },
          }}
          bezier
          style={{ marginVertical: 8, borderRadius: 16 }}
        />
      )}

      {growthData.length === 0 && selectedPet && (
        <Text style={styles.noPets}>Henüz kilo veya boy verisi bulunmuyor.</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  formContainer: {
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
  petList: {
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 10,
    textAlign: 'center',
  },
  noPets: {
    textAlign: 'center',
    fontSize: 16,
    color: '#888',
  },
});

export default PetGrowthTracker;
