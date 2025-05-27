import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import { Text, Card, ActivityIndicator } from 'react-native-paper';

interface LinkPreviewProps {
  url: string;
}

interface MetaData {
  title?: string;
  description?: string;
  image?: string;
}

export const LinkPreview: React.FC<LinkPreviewProps> = ({ url }) => {
  const [meta, setMeta] = useState<MetaData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchMeta() {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch(`https://opengraph.io/api/1.1/site/${encodeURIComponent(url)}?app_id=demo`);
        const data = await res.json();
        if (!cancelled && data && data.hybridGraph) {
          setMeta({
            title: data.hybridGraph.title,
            description: data.hybridGraph.description,
            image: data.hybridGraph.image,
          });
        }
      } catch (e) {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchMeta();
    return () => { cancelled = true; };
  }, [url]);

  if (loading) return <ActivityIndicator style={{ marginVertical: 8 }} />;
  if (error) return null;
  if (!meta.title && !meta.image) return null;

  return (
    <TouchableOpacity onPress={() => Linking.openURL(url)}>
      <Card style={styles.card}>
        {meta.image && (
          <Image source={{ uri: meta.image }} style={styles.image} resizeMode="cover" />
        )}
        <Card.Content>
          <Text style={styles.title}>{meta.title || url}</Text>
          {meta.description && <Text style={styles.desc}>{meta.description}</Text>}
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    elevation: 2,
  },
  image: {
    width: '100%',
    height: 140,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  desc: {
    color: '#555',
    fontSize: 13,
  },
}); 