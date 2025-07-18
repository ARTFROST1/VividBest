import React, { useState, useEffect, useRef } from 'react';
import { View, FlatList, StyleSheet, Platform, Animated, Switch, ActionSheetIOS, Modal, TouchableOpacity, KeyboardAvoidingView, Keyboard, TouchableWithoutFeedback, LayoutChangeEvent, ScrollView, Alert, Linking } from 'react-native';
import { Icon, Checkbox, Text, TextInput, Button, Card, useTheme, FAB, ProgressBar, Menu, Divider, Chip, IconButton } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import { useTags } from '../hooks/useTags';
import { TagSelector } from '../components/TagSelector';
import { PrioritySelector } from '../components/PrioritySelector';
import { TaskCalendar } from '../components/TaskCalendar';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Swipeable } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  dueDate: string; // YYYY-MM-DD
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  repeatInterval: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  reminderTime?: string; // HH:mm
  notificationId?: string;
}

const PRIORITY_COLORS = {
  low: '#83be7d',
  medium: '#ebbf5a',
  high: '#bf4c38',
};

const PRIORITY_LABELS = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
};

const REPEAT_LABELS = {
  none: 'Не повторять',
  daily: 'Ежедневно',
  weekly: 'Еженедельно',
  monthly: 'Ежемесячно',
  yearly: 'Каждый год',
};

const TASKS_STORAGE_KEY = 'TASKS_V1';

function formatDate(date: Date) {
  return date.toISOString().split('T')[0];
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

const TasksScreen = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState('');
  const [inputVisible, setInputVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTabIndex, setSelectedTabIndex] = useState(1); // Default to 'Today' (middle tab)
  const [newTaskDate, setNewTaskDate] = useState(selectedDate);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [repeatInterval, setRepeatInterval] = useState<'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'>('none');
  const [reminderTime, setReminderTime] = useState<string | undefined>(undefined);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [prioritySelected, setPrioritySelected] = useState(false);
  const [repeatSelected, setRepeatSelected] = useState(false);
  const theme = useTheme();
  const { colors, roundness } = theme;
  const c = colors as any;
  const {
    tags: allTags,
    addTag: addGlobalTag,
    removeTag: removeGlobalTag,
    updateTag: updateGlobalTag,
  } = useTags();
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const { t } = useTranslation();
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [showPriorityModal, setShowPriorityModal] = useState(false);
  const [showRepeatModal, setShowRepeatModal] = useState(false);
  const [sendNotification, setSendNotification] = useState(true);
  const [optionsAnim] = useState(new Animated.Value(0));
  const [showDatePickerInline, setShowDatePickerInline] = useState(false);
  const [showTimePickerInline, setShowTimePickerInline] = useState(false);
  const inputRef = useRef(null);
  const [barWidth, setBarWidth] = useState(0);
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const [showNewTaskDatePicker, setShowNewTaskDatePicker] = useState(false);
  const [showNewTaskTimePicker, setShowNewTaskTimePicker] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showCustomTimePicker, setShowCustomTimePicker] = useState(false);
  const [showDateFilterModal, setShowDateFilterModal] = useState(false);
  const [selectedFilterDate, setSelectedFilterDate] = useState<Date | null>(null);

  useEffect(() => {
    Notifications.requestPermissionsAsync();
  }, []);

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const saved = await AsyncStorage.getItem(TASKS_STORAGE_KEY);
        if (saved) {
          const parsed: Task[] = JSON.parse(saved);
          setTasks(parsed);
          // Восстановить уведомления для актуальных задач
          parsed.forEach(async (task) => {
            if (!task.completed && task.reminderTime && !task.notificationId) {
              const notificationId = await scheduleTaskNotification(task);
              setTasks((prev) =>
                prev.map((t) =>
                  t.id === task.id ? { ...t, notificationId } : t
                )
              );
            }
          });
        }
      } catch (e) {
        console.error('Ошибка загрузки задач:', e);
      }
    };
    loadTasks();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  // Синхронизируем newTaskDate с selectedDate для быстрого ввода
  useEffect(() => {
    if (!showCalendarModal) {
      setNewTaskDate(selectedDate);
    }
  }, [selectedDate, showCalendarModal]);

  // Get tasks based on selected tab
  const getFilteredTasks = () => {
    // Если выбрана конкретная дата через календарь
    if (selectedFilterDate) {
      return tasks
        .filter(task => task.dueDate === formatDate(selectedFilterDate))
        .sort((a, b) => {
          // Сначала невыполненные, потом выполненные
          if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
          }
          // Внутри групп — по приоритету
          const order = { high: 2, medium: 1, low: 0 };
          return order[b.priority] - order[a.priority];
        });
    }
    
    // For Past tab (index 0), show tasks grouped by date
    if (selectedTabIndex === 0) {
      return tasks.filter(task => {
        const taskDate = new Date(task.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return taskDate < today;
      }).sort((a, b) => {
        // Sort by date (newest first)
        return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
      });
    } 
    // For Today and Tomorrow tabs, keep existing behavior
    return tasks
      .filter(task => task.dueDate === formatDate(selectedDate))
      .sort((a, b) => {
        // Сначала невыполненные, потом выполненные
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }
        // Внутри групп — по приоритету
        const order = { high: 2, medium: 1, low: 0 };
        return order[b.priority] - order[a.priority];
      });
  };

  const filteredTasks = getFilteredTasks();

  const completedCount = filteredTasks.filter(t => t.completed).length;
  const progress = filteredTasks.length > 0 ? completedCount / filteredTasks.length : 0;

  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: progress,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  async function scheduleTaskNotification(task: Task): Promise<string | undefined> {
    if (!task.reminderTime) return undefined;
    const [h, m] = task.reminderTime.split(':').map(Number);
    const due = new Date(task.dueDate + 'T' + task.reminderTime + ':00');
    if (due < new Date()) return undefined;
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Напоминание о задаче',
        body: task.title,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        year: due.getFullYear(),
        month: due.getMonth() + 1, // JS: 0-11, Expo: 1-12
        day: due.getDate(),
        hour: due.getHours(),
        minute: due.getMinutes(),
        second: 0,
        repeats: false,
      },
    });
    return id;
  }

  async function cancelTaskNotification(notificationId?: string) {
    if (notificationId) {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    }
  }

  const handleSelectTag = (tagId: string) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  async function updateTaskNotification(task: Task): Promise<string | undefined> {
    if (task.notificationId) {
      await cancelTaskNotification(task.notificationId);
    }
    if (task.reminderTime) {
      return await scheduleTaskNotification(task);
    }
    return undefined;
  }

  async function ensureNotificationPermission(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const { status: reqStatus } = await Notifications.requestPermissionsAsync();
      if (reqStatus !== 'granted') {
        alert(t('notification_permission_denied', 'Разрешение на уведомления не выдано. Напоминания не будут работать.'));
        return false;
      }
    }
    return true;
  }

  const handleAddTask = async () => {
    if (newTask.trim()) {
      let notificationId: string | undefined = undefined;
      if (reminderTime && sendNotification) {
        const hasPerm = await ensureNotificationPermission();
        if (hasPerm) {
          const taskDate = inputVisible ? selectedDate : newTaskDate;
          notificationId = await scheduleTaskNotification({
            id: '',
            title: newTask.trim(),
            completed: false,
            dueDate: formatDate(taskDate),
            priority,
            tags: selectedTagIds.map(id => allTags.find(t => t.id === id)?.name || ''),
            repeatInterval,
            reminderTime,
            notificationId: undefined,
          });
        }
      }
      // Используем текущую дату для задач, создаваемых в режиме быстрого ввода
      const taskDate = inputVisible ? selectedDate : newTaskDate;
      
      setTasks(prev => [
        {
          id: Date.now().toString(),
          title: newTask.trim(),
          completed: false,
          dueDate: formatDate(taskDate),
          priority,
          tags: selectedTagIds.map(id => allTags.find(t => t.id === id)?.name || ''),
          repeatInterval,
          reminderTime,
          notificationId,
        },
        ...prev,
      ]);
      setNewTask('');
      setInputVisible(false);
      setNewTaskDate(selectedDate); // Сброс на текущую выбранную дату
      setPriority('medium');
      setPrioritySelected(false);
      setSelectedTagIds([]);
      setRepeatInterval('none');
      setRepeatSelected(false);
      setReminderTime(undefined);
      setSendNotification(true);
    }
  };

  function getNextDate(date: Date, interval: 'daily' | 'weekly' | 'monthly') {
    const d = new Date(date);
    if (interval === 'daily') d.setDate(d.getDate() + 1);
    if (interval === 'weekly') d.setDate(d.getDate() + 7);
    if (interval === 'monthly') d.setMonth(d.getMonth() + 1);
    return d;
  }

  const handleToggleTask = (id: string) => {
    setTasks(prev => prev.map(task => {
      if (task.id === id) {
        if (!task.completed && task.repeatInterval !== 'none') {
          const nextDate = getNextDate(new Date(task.dueDate), task.repeatInterval as any);
          (async () => {
            let notificationId: string | undefined = undefined;
            if (task.reminderTime) {
              notificationId = await scheduleTaskNotification({
                ...task,
                dueDate: formatDate(nextDate),
              });
            }
            setTasks(tasks => [
              ...tasks,
              {
                ...task,
                id: Date.now().toString() + Math.random(),
                completed: false,
                dueDate: formatDate(nextDate),
                notificationId,
              },
            ]);
          })();
        }
        if (!task.completed && task.notificationId) {
          cancelTaskNotification(task.notificationId);
        }
        return { ...task, completed: !task.completed };
      }
      return task;
    }));
  };

  const handleToggleReminder = async (task: Task) => {
    if (task.reminderTime) {
      if (task.notificationId) await cancelTaskNotification(task.notificationId);
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, reminderTime: undefined, notificationId: undefined } : t));
    } else {
      const now = new Date();
      now.setMinutes(now.getMinutes() + 5);
      const h = now.getHours().toString().padStart(2, '0');
      const m = now.getMinutes().toString().padStart(2, '0');
      const reminderTime = `${h}:${m}`;
      const hasPerm = await ensureNotificationPermission();
      let notificationId: string | undefined = undefined;
      if (hasPerm) {
        notificationId = await scheduleTaskNotification({ ...task, reminderTime });
      }
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, reminderTime, notificationId } : t));
    }
  };

  const handleDeleteTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task?.notificationId) {
      await cancelTaskNotification(task.notificationId);
    }
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const renderRightActions = (item: Task) => (
    <TouchableOpacity
      style={styles.swipeDeleteButton}
      onPress={() => handleDeleteTask(item.id)}
    >
      <IconButton icon="trash-can-outline" size={25} iconColor="#FFFFFF" style={styles.swipeActionIcon} />
    </TouchableOpacity>
  );

  const renderItem = ({ item }: { item: Task }) => (
    <Swipeable
      renderRightActions={() => renderRightActions(item)}
      overshootRight={false}
    >
      <Card style={[
        styles.taskCard,
        {
          backgroundColor: theme.dark ? '#1C1C1E' : '#FFFFFF',
          borderRadius: 12,
          shadowColor: theme.dark ? '#000000' : '#000000',
          shadowOpacity: theme.dark ? 0.3 : 0.08,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 1 },
          elevation: 2,
          opacity: item.completed ? 0.6 : 1,
          borderWidth: theme.dark ? 0.5 : 0,
          borderColor: theme.dark ? '#1C1C1E' : 'transparent',
        },
      ]}>
        <View style={styles.taskRow}>
          <View style={{ marginRight: 10 }}>
            <Checkbox
              status={item.completed ? 'checked' : 'unchecked'}
              onPress={() => handleToggleTask(item.id)}
              color={PRIORITY_COLORS[item.priority]}
            />
          </View>
          <View style={{ flex: 1 }}>
            <View style={item.completed ? { opacity: 0.8 } : undefined}>
              <Text
                style={[
                  styles.taskTitle,
                  {
                    color: theme.dark ? '#FFFFFF' : '#000000',
                    textDecorationLine: item.completed ? 'line-through' : 'none',
                  },
                ]}
              >
                {item.title}
              </Text>
              <View style={styles.taskMetaRow}>
                <Text style={[styles.taskMeta, { color: theme.dark ? '#8E8E93' : '#8E8E93' }]}>{item.dueDate}</Text>
                <Text style={[styles.taskMeta, { color: PRIORITY_COLORS[item.priority], fontWeight: '500' }]}>{PRIORITY_LABELS[item.priority]}</Text>
                {item.reminderTime && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.dark ? '#2C2C2E' : '#F2F2F7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <Icon source="clock-outline" size={12} color={theme.dark ? '#8E8E93' : '#8E8E93'} />
                    <Text style={{ fontSize: 12, color: theme.dark ? '#8E8E93' : '#8E8E93', marginLeft: 2 }}>{item.reminderTime}</Text>
                  </View>
                )}
                {item.tags && item.tags.map(tag => (
                  <View key={tag} style={item.completed ? { opacity: 0.7 } : undefined}>
                    <Text style={[styles.tag, { backgroundColor: theme.dark ? '#2C2C2E' : '#F2F2F7', color: theme.dark ? '#FFFFFF' : '#000000' }]}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
          <Icon source="chevron-right" size={20} color={theme.dark ? '#636366' : '#C7C7CC'} />
        </View>
      </Card>
    </Swipeable>
  );

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
      // Update selected tab based on the date
      const today = new Date();
      const tomorrow = addDays(today, 1);
      
      if (formatDate(date) === formatDate(today)) {
        setSelectedTabIndex(1); // Today
      } else if (formatDate(date) === formatDate(tomorrow)) {
        setSelectedTabIndex(2); // Tomorrow
      } else if (date < today) {
        setSelectedTabIndex(0); // Past
      }
    }
  };

  const handleTabChange = (event: any) => {
    const index = event.nativeEvent.selectedSegmentIndex;
    setSelectedTabIndex(index);
    
    const today = new Date();
    
    switch(index) {
      case 0: // Past - set to yesterday for now
        setSelectedDate(addDays(today, -1));
        break;
      case 1: // Today
        setSelectedDate(today);
        break;
      case 2: // Tomorrow
        setSelectedDate(addDays(today, 1));
        break;
    }
  };

  const handleNewTaskDateChange = (event: any, date?: Date) => {
    if (date) {
      setNewTaskDate(date);
    }
  };

  const handleInputFocus = () => setIsInputFocused(true);
  const handleInputBlur = () => {
    if (!newTask.trim()) setIsInputFocused(false);
  };

  // Group past tasks by date categories
  const groupTasksByDate = (tasks: Task[]) => {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const lastWeekStart = new Date(today);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return {
      yesterday: tasks.filter(task => {
        const taskDate = new Date(task.dueDate);
        return taskDate.getTime() >= yesterday.getTime() && taskDate.getTime() < today.getTime();
      }),
      lastWeek: tasks.filter(task => {
        const taskDate = new Date(task.dueDate);
        return taskDate.getTime() >= lastWeekStart.getTime() && taskDate.getTime() < yesterday.getTime();
      }),
      lastMonth: tasks.filter(task => {
        const taskDate = new Date(task.dueDate);
        return taskDate.getTime() >= thirtyDaysAgo.getTime() && taskDate.getTime() < lastWeekStart.getTime();
      }),
      older: tasks.filter(task => {
        const taskDate = new Date(task.dueDate);
        return taskDate.getTime() < thirtyDaysAgo.getTime();
      })
    };
  };

  // Анимация появления/скрытия блока опций
  useEffect(() => {
    if (isInputFocused) {
      Animated.timing(optionsAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(optionsAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }).start();
    }
  }, [isInputFocused]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
    >
      <ScrollView 
        style={[styles.container, { backgroundColor: theme.dark ? '#000000' : '#F2F2F7' }]}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Заголовок с кнопкой выбора даты */}
        <View style={styles.headerRow}>
          <Text style={[styles.header, { color: theme.dark ? '#FFFFFF' : '#000000' }]}>{t('daily_tasks', 'Мой поток задач')}</Text>
          <TouchableOpacity
            style={[
              styles.dateFilterButton, 
              { 
                backgroundColor: selectedFilterDate 
                  ? 'transparent' 
                  : theme.dark ? '#1C1C1E' : '#FFFFFF' 
              }
            ]}
            onPress={() => setShowDateFilterModal(true)}
          >
            {selectedFilterDate ? (
              <LinearGradient
                colors={['#7745dc', '#f34f8c']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.dateFilterGradient}
              >
                <Text style={styles.dateFilterText}>
                  {selectedFilterDate.toLocaleDateString('ru-RU', { 
                    day: 'numeric', 
                    month: 'short' 
                  })}
                </Text>
              </LinearGradient>
            ) : (
              <Icon 
                source="calendar" 
                size={20} 
                color={theme.dark ? '#FFFFFF' : '#000000'} 
              />
            )}
          </TouchableOpacity>
        </View>
        {/* Выбор даты - тройной переключатель на всю ширину */}
        <View style={styles.fullWidthSegmentedControl}>
          <View style={[styles.segmentedControl, { backgroundColor: theme.dark ? '#1C1C1E' : '#E9E9EB' }]}>
            {[t('past', 'Прошлые'), t('today', 'Сегодня'), t('tomorrow', 'Завтра')].map((value, index) => {
              const isSelected = index === selectedTabIndex && !selectedFilterDate;
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.segmentButton,
                    styles.fullWidthSegmentButton,
                    index === 0 && styles.leftSegment,
                    index === 2 && styles.rightSegment,
                  ]}
                  onPress={() => {
                    setSelectedFilterDate(null);
                    handleTabChange({ nativeEvent: { selectedSegmentIndex: index } });
                  }}
                >
                  {isSelected ? (
                    <LinearGradient
                      colors={['#7745dc', '#f34f8c']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.selectedSegment, { position: 'absolute', width: '100%', height: '100%' }]}
                    />
                  ) : null}
                  <Text
                    style={[
                      styles.segmentButtonText,
                      {
                        color: isSelected ? '#FFFFFF' : theme.dark ? '#FFFFFF' : '#000000',
                        fontWeight: isSelected ? '600' : '400',
                      },
                    ]}
                  >
                    {value}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {filteredTasks.length > 0 && (
          <View style={styles.progressContainer}>
            <View
              style={[styles.progressBar, { backgroundColor: theme.dark ? '#38383A' : '#E5E5EA', overflow: 'hidden' }]}
              onLayout={(e: LayoutChangeEvent) => setBarWidth(e.nativeEvent.layout.width)}
            >
              <LinearGradient
                colors={['#7745dc', '#f34f8c']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              {barWidth > 0 && (
                <Animated.View
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: animatedProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [barWidth, 0],
                    }),
                    backgroundColor: theme.dark ? '#38383A' : '#E5E5EA',
                  }}
                />
              )}
            </View>
            <Text style={[styles.progressText, { color: theme.dark ? '#8E8E93' : '#8E8E93' }]}>{Math.round(progress * 100)}% {t('completed', 'выполнено')}</Text>
          </View>
        )}
        {selectedTabIndex !== 0 && !selectedFilterDate && (
          <View style={styles.inputContainer}>
            <View style={styles.inputRow}>
              <TextInput
                ref={inputRef}
                value={newTask}
                onChangeText={setNewTask}
                placeholder={t('add_task_placeholder', 'Новая задача...')}
                style={[
                  styles.input, 
                  {
                    backgroundColor: theme.dark ? '#1c1c1e' : '#e4e3e9',
                    color: theme.dark ? '#888888' : '#888888',
                    borderWidth: 0,
                    borderBottomWidth: 0
                  }
                ]}
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                placeholderTextColor={theme.dark ? '#888888' : '#888888'}
                onFocus={handleInputFocus}
                onBlur={() => {}}
                underlineColorAndroid="transparent"
              />
            </View>
          </View>
        )}
        {/* Современное окно создания задачи */}
        {isInputFocused && (
          <Animated.View
            style={[
              styles.modernTaskCreator,
              {
                opacity: optionsAnim,
                transform: [{ translateY: optionsAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
                backgroundColor: theme.dark ? '#1C1C1E' : '#FFFFFF',
                shadowColor: theme.dark ? '#000' : '#000',
              }
            ]}
          >
            {/* Заголовок */}
            <View style={styles.creatorHeader}>
              <Text style={[styles.creatorTitle, { color: theme.dark ? '#FFFFFF' : '#000000' }]}>
                Новая задача
              </Text>
            </View>

            {/* Дата */}
            <View style={styles.modernSection}>
              <View style={styles.sectionHeader}>
                <Icon source="calendar" size={20} color="#8a44da" />
                <Text style={[styles.sectionLabel, { color: theme.dark ? '#FFFFFF' : '#000000' }]}>
                  Дата
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.modernButton, { backgroundColor: theme.dark ? '#2C2C2E' : '#F8F9FA' }]}
                onPress={() => setShowCalendarModal(true)}
              >
                <Text style={[styles.modernButtonText, { color: '#8a44da' }]}>
                  {newTaskDate.toLocaleDateString('ru-RU', { 
                    day: 'numeric', 
                    month: 'long',
                    year: 'numeric'
                  })}
                </Text>
                <Icon source="chevron-right" size={20} color="#8a44da" />
              </TouchableOpacity>
            </View>

            {/* Приоритет */}
            <View style={styles.modernSection}>
              <View style={styles.sectionHeader}>
                <Icon source="alert-circle" size={20} color="#8a44da" />
                <Text style={[styles.sectionLabel, { color: theme.dark ? '#FFFFFF' : '#000000' }]}>
                  Приоритет
                </Text>
              </View>
              <View style={styles.prioritySelector}>
                {(['low', 'medium', 'high'] as const).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.priorityOption,
                      {
                        backgroundColor: priority === p 
                          ? PRIORITY_COLORS[p] + '20'
                          : theme.dark ? '#2C2C2E' : '#F8F9FA',
                        borderColor: priority === p 
                          ? PRIORITY_COLORS[p]
                          : theme.dark ? '#3C3C3E' : '#E5E5EA',
                      }
                    ]}
                    onPress={() => {
                      setPriority(p);
                      setPrioritySelected(true);
                    }}
                  >
                    <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLORS[p] }]} />
                    <Text style={[
                      styles.priorityText,
                      {
                        color: priority === p 
                          ? PRIORITY_COLORS[p]
                          : theme.dark ? '#FFFFFF' : '#000000',
                        fontWeight: priority === p ? '600' : '400',
                      }
                    ]}>
                      {PRIORITY_LABELS[p]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Повторение - Выпадающий список */}
            <View style={styles.modernSection}>
              <View style={styles.sectionHeader}>
                <Icon source="repeat" size={20} color="#8a44da" />
                <Text style={[styles.sectionLabel, { color: theme.dark ? '#FFFFFF' : '#000000' }]}>
                  Повторение
                </Text>
              </View>
              <View style={styles.dropdownContainer}>
                <Menu
                  visible={showRepeatModal}
                  onDismiss={() => setShowRepeatModal(false)}
                  anchor={
                    <TouchableOpacity
                      style={[styles.modernButton, { backgroundColor: theme.dark ? '#2C2C2E' : '#F8F9FA' }]}
                      onPress={() => setShowRepeatModal(true)}
                    >
                      <Text style={[
                        styles.modernButtonText,
                        { color: repeatSelected ? '#8a44da' : theme.dark ? '#8E8E93' : '#8E8E93' }
                      ]}>
                        {repeatSelected ? REPEAT_LABELS[repeatInterval] : 'Не повторять'}
                      </Text>
                      <Icon source="chevron-down" size={20} color="#8a44da" />
                    </TouchableOpacity>
                  }
                  contentStyle={[
                    styles.dropdownMenu,
                    { backgroundColor: theme.dark ? '#1C1C1E' : '#FFFFFF' }
                  ]}
                >
                  {(['none', 'daily', 'weekly', 'monthly', 'yearly'] as const).map((interval) => (
                    <Menu.Item
                      key={interval}
                      onPress={() => {
                        setRepeatInterval(interval);
                        setRepeatSelected(true);
                        setShowRepeatModal(false);
                      }}
                      title={REPEAT_LABELS[interval]}
                      titleStyle={[
                        styles.dropdownItemText,
                        {
                          color: repeatInterval === interval
                            ? '#8a44da'
                            : theme.dark ? '#FFFFFF' : '#000000',
                          fontWeight: repeatInterval === interval ? '600' : '400',
                        }
                      ]}
                      leadingIcon={repeatInterval === interval ? 'check' : undefined}
                      style={styles.dropdownItem}
                    />
                  ))}
                </Menu>
              </View>
            </View>

            {/* Уведомления */}
            <View style={styles.modernSection}>
              <View style={styles.notificationRow}>
                <View style={styles.sectionHeader}>
                  <Icon source="bell" size={20} color="#8a44da" />
                  <Text style={[styles.sectionLabel, { color: theme.dark ? '#FFFFFF' : '#000000' }]}>
                    Уведомление
                  </Text>
                </View>
                <Switch
                  value={sendNotification}
                  onValueChange={setSendNotification}
                  thumbColor="#FFFFFF"
                  trackColor={{ true: '#8a44da', false: theme.dark ? '#636366' : '#E5E5EA' }}
                  ios_backgroundColor={theme.dark ? '#636366' : '#E5E5EA'}
                />
              </View>
              
              {/* Время уведомления (показывается только если включено) */}
              {sendNotification && (
                <TouchableOpacity
                  style={[styles.modernButton, { backgroundColor: theme.dark ? '#2C2C2E' : '#F8F9FA', marginTop: 8 }]}
                  onPress={() => setShowNewTaskTimePicker(true)}
                >
                  <Text style={[styles.modernButtonText, { color: '#8a44da' }]}>
                    {reminderTime ? `Напомнить в ${reminderTime}` : 'Выберите время'}
                  </Text>
                  <Icon source="clock" size={20} color="#8a44da" />
                </TouchableOpacity>
              )}
              {showNewTaskTimePicker && (
                <DateTimePicker
                  value={reminderTime ? new Date(`${formatDate(newTaskDate)}T${reminderTime}:00`) : newTaskDate}
                  mode="time"
                  is24Hour={true}
                  display="default"
                  onChange={(event, date) => {
                    setShowNewTaskTimePicker(false);
                    if (date) {
                      const h = date.getHours().toString().padStart(2, '0');
                      const m = date.getMinutes().toString().padStart(2, '0');
                      setReminderTime(`${h}:${m}`);
                    }
                  }}
                />
              )}
            </View>

            {/* Кнопки действий */}
            <View style={styles.modernActionButtons}>
              <TouchableOpacity
                style={[styles.modernCancelButton, { borderColor: theme.dark ? '#636366' : '#E5E5EA' }]}
                onPress={() => {
                  // Очистка всех полей
                  setIsInputFocused(false);
                  setNewTask('');
                  setNewTaskDate(new Date());
                  setPriority('medium');
                  setPrioritySelected(false);
                  setRepeatInterval('none');
                  setRepeatSelected(false);
                  setReminderTime(undefined);
                  setSendNotification(true);
                  if (inputRef.current) inputRef.current.blur();
                }}
              >
                <Text style={[styles.cancelButtonText, { color: theme.dark ? '#8E8E93' : '#8E8E93' }]}>
                  Отмена
                </Text>
              </TouchableOpacity>
              
              <LinearGradient
                colors={['#7745dc', '#f34f8c']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.modernAddButton}
              >
                <TouchableOpacity
                  style={styles.addButtonContent}
                  onPress={() => {
                    handleAddTask();
                    setIsInputFocused(false);
                    if (inputRef.current) inputRef.current.blur();
                  }}
                >
                  <Text style={styles.addButtonText}>Добавить</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </Animated.View>
        )}
        
        {/* Модальное окно кастомного времени */}
        <Modal visible={showCustomTimePicker} transparent animationType="fade" onRequestClose={() => setShowCustomTimePicker(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.customTimeModalContent, { backgroundColor: theme.dark ? '#1C1C1E' : '#FFFFFF' }]}>
              <View style={styles.customTimeModalHeader}>
                <Text style={[styles.customTimeModalTitle, { color: theme.dark ? '#FFFFFF' : '#000000' }]}>
                  Точное время
                </Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowCustomTimePicker(false)}
                >
                  <Icon source="close" size={24} color={theme.dark ? '#FFFFFF' : '#000000'} />
                </TouchableOpacity>
              </View>
              
              {Platform.OS === 'web' ? (
                // Веб-версия с ручным вводом времени
                <View style={styles.webTimeInputContainer}>
                  <Text style={[styles.webTimeInputLabel, { color: theme.dark ? '#FFFFFF' : '#000000' }]}>
                    Введите время (чч:мм):
                  </Text>
                  <TextInput
                    style={[
                      styles.webTimeInput,
                      {
                        backgroundColor: theme.dark ? '#2C2C2E' : '#F8F9FA',
                        color: theme.dark ? '#FFFFFF' : '#000000',
                      }
                    ]}
                    value={reminderTime || ''}
                    onChangeText={(text) => {
                      // Форматирование времени в процессе ввода
                      let formattedText = text.replace(/[^\d]/g, '');
                      if (formattedText.length >= 3) {
                        formattedText = formattedText.slice(0, 2) + ':' + formattedText.slice(2, 4);
                      }
                      setReminderTime(formattedText);
                    }}
                    placeholder="09:00"
                    placeholderTextColor={theme.dark ? '#8E8E93' : '#8E8E93'}
                    maxLength={5}
                  />
                  <View style={styles.webTimeButtons}>
                    <TouchableOpacity
                      style={[styles.webTimeCancelButton, { borderColor: theme.dark ? '#636366' : '#E5E5EA' }]}
                      onPress={() => setShowCustomTimePicker(false)}
                    >
                      <Text style={[styles.webTimeCancelText, { color: theme.dark ? '#8E8E93' : '#8E8E93' }]}>
                        Отмена
                      </Text>
                    </TouchableOpacity>
                    <LinearGradient
                      colors={['#7745dc', '#f34f8c']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.webTimeOkButton}
                    >
                      <TouchableOpacity
                        style={styles.webTimeOkButtonContent}
                        onPress={() => {
                          setShowCustomTimePicker(false);
                        }}
                      >
                        <Text style={styles.webTimeOkText}>Готово</Text>
                      </TouchableOpacity>
                    </LinearGradient>
                  </View>
                </View>
              ) : (
                // Мобильная версия с DateTimePicker
                <View style={styles.nativeTimePickerContainer}>
                  <DateTimePicker
                    value={reminderTime ? new Date(`2000-01-01T${reminderTime}:00`) : new Date()}
                    mode="time"
                    is24Hour={true}
                    display="spinner"
                    themeVariant={theme.dark ? 'dark' : 'light'}
                    onChange={(event, date) => {
                      if (date) {
                        const h = date.getHours().toString().padStart(2, '0');
                        const m = date.getMinutes().toString().padStart(2, '0');
                        setReminderTime(`${h}:${m}`);
                      }
                    }}
                  />
                  <View style={styles.nativeTimeButtons}>
                    <TouchableOpacity
                      style={[styles.nativeTimeCancelButton, { borderColor: theme.dark ? '#636366' : '#E5E5EA' }]}
                      onPress={() => setShowCustomTimePicker(false)}
                    >
                      <Text style={[styles.nativeTimeCancelText, { color: theme.dark ? '#8E8E93' : '#8E8E93' }]}>
                        Отмена
                      </Text>
                    </TouchableOpacity>
                    <LinearGradient
                      colors={['#7745dc', '#f34f8c']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.nativeTimeOkButton}
                    >
                      <TouchableOpacity
                        style={styles.nativeTimeOkButtonContent}
                        onPress={() => setShowCustomTimePicker(false)}
                      >
                        <Text style={styles.nativeTimeOkText}>Готово</Text>
                      </TouchableOpacity>
                    </LinearGradient>
                  </View>
                </View>
              )}
            </View>
          </View>
        </Modal>
        <Divider style={[styles.divider, { backgroundColor: c.divider }]} />
        
        {/* Условный рендеринг: календарь или списки */}
        {viewMode === 'calendar' ? (
          <TaskCalendar
            tasks={tasks}
            selectedDate={selectedDate}
            onDateSelect={(date) => {
              setSelectedDate(date);
              // Обновляем выбранную вкладку при выборе даты
              const today = new Date();
              const tomorrow = addDays(today, 1);
              
              if (formatDate(date) === formatDate(today)) {
                setSelectedTabIndex(1); // Today
              } else if (formatDate(date) === formatDate(tomorrow)) {
                setSelectedTabIndex(2); // Tomorrow
              } else if (date < today) {
                setSelectedTabIndex(0); // Past
              }
            }}
          />
        ) : (
          <>
            {selectedTabIndex === 0 ? (
              // Past tasks grouped by date
              <ScrollView 
                style={{flex: 1}}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              >
                {(() => {
                  const groupedTasks = groupTasksByDate(filteredTasks);
                  return (
                    <>
                      {/* Yesterday */}
                      {groupedTasks.yesterday.length > 0 && (
                        <>
                          <Text style={[styles.timeGroupHeader, { color: theme.dark ? '#FFFFFF' : '#000000' }]}>{t('yesterday', 'Вчера')}</Text>
                          {groupedTasks.yesterday.map(item => (
                            <View key={item.id} style={{marginBottom: 8}}>
                              {renderItem({item})}
                            </View>
                          ))}
                        </>
                      )}
                      
                      {/* Last Week */}
                      {groupedTasks.lastWeek.length > 0 && (
                        <>
                          <Text style={[styles.timeGroupHeader, { color: theme.dark ? '#FFFFFF' : '#000000' }]}>{t('last_week', 'На прошлой неделе')}</Text>
                          {groupedTasks.lastWeek.map(item => (
                            <View key={item.id} style={{marginBottom: 8}}>
                              {renderItem({item})}
                            </View>
                          ))}
                        </>
                      )}
                      
                      {/* Last 30 Days */}
                      {groupedTasks.lastMonth.length > 0 && (
                        <>
                          <Text style={[styles.timeGroupHeader, { color: theme.dark ? '#FFFFFF' : '#000000' }]}>{t('last_30_days', 'Предыдущие 30 дней')}</Text>
                          {groupedTasks.lastMonth.map(item => (
                            <View key={item.id} style={{marginBottom: 8}}>
                              {renderItem({item})}
                            </View>
                          ))}
                        </>
                      )}
                      
                      {/* Older */}
                      {groupedTasks.older.length > 0 && (
                        <>
                          <Text style={[styles.timeGroupHeader, { color: theme.dark ? '#FFFFFF' : '#000000' }]}>{t('older', 'Более старые')}</Text>
                          {groupedTasks.older.map(item => (
                            <View key={item.id} style={{marginBottom: 8}}>
                              {renderItem({item})}
                            </View>
                          ))}
                        </>
                      )}
                      
                      {/* No tasks message */}
                      {filteredTasks.length === 0 && (
                        <Text style={[styles.emptyListText, { color: theme.dark ? '#8E8E93' : '#8E8E93' }]}>{t('no_past_tasks', 'Нет прошедших задач')}</Text>
                      )}
                    </>
                  );
                })()} 
              </ScrollView>
            ) : (
              // Regular task list for Today and Tomorrow tabs
              <FlatList
                data={filteredTasks}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                showsVerticalScrollIndicator={false}
              />
            )}
          </>
        )}
      </ScrollView>
      
      {/* Модальный календарь */}
      <Modal visible={showCalendarModal} transparent animationType="fade" onRequestClose={() => setShowCalendarModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.calendarModalContent, { backgroundColor: theme.dark ? '#1C1C1E' : '#FFFFFF' }]}>
            <View style={styles.calendarModalHeader}>
              <Text style={[styles.calendarModalTitle, { color: theme.dark ? '#FFFFFF' : '#000000' }]}>
                Выберите дату
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowCalendarModal(false)}
              >
                <Icon source="close" size={24} color={theme.dark ? '#FFFFFF' : '#000000'} />
              </TouchableOpacity>
            </View>
            <TaskCalendar
              tasks={tasks}
              selectedDate={newTaskDate}
              onDateSelect={(date) => {
                setNewTaskDate(date);
                setShowCalendarModal(false);
              }}
              onTaskPress={() => {}}
            />
          </View>
        </View>
      </Modal>

      {/* Модальное окно времени */}
      <Modal visible={showNewTaskTimePicker} transparent animationType="fade" onRequestClose={() => setShowNewTaskTimePicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.timeModalContent, { backgroundColor: theme.dark ? '#1C1C1E' : '#FFFFFF' }]}>
            <View style={styles.timeModalHeader}>
              <Text style={[styles.timeModalTitle, { color: theme.dark ? '#FFFFFF' : '#000000' }]}>
                Время напоминания
              </Text>
            </View>
            <View style={styles.timePickerContainer}>
              {/* Создаем простой выбор времени */}
              <View style={styles.timeGrid}>
                {['09:00', '12:00', '15:00', '18:00', '20:00', '21:00'].map((time) => (
                  <TouchableOpacity
                    key={time}
                    style={[
                      styles.timeOption,
                      {
                        backgroundColor: reminderTime === time 
                          ? '#8a44da' 
                          : theme.dark ? '#2C2C2E' : '#F8F9FA',
                        borderColor: reminderTime === time 
                          ? '#8a44da' 
                          : theme.dark ? '#3C3C3E' : '#E5E5EA',
                      }
                    ]}
                    onPress={() => {
                      setReminderTime(time);
                      setShowNewTaskTimePicker(false);
                    }}
                  >
                    <Text style={[
                      styles.timeOptionText,
                      {
                        color: reminderTime === time 
                          ? '#FFFFFF' 
                          : theme.dark ? '#FFFFFF' : '#000000',
                      }
                    ]}>
                      {time}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={[styles.customTimeButton, { backgroundColor: theme.dark ? '#2C2C2E' : '#F8F9FA' }]}
                onPress={() => {
                  setShowNewTaskTimePicker(false);
                  setTimeout(() => setShowCustomTimePicker(true), 100);
                }}
              >
                <Icon source="clock-edit" size={20} color="#8a44da" />
                <Text style={[styles.customTimeText, { color: '#8a44da' }]}>
                  Другое время
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.timeModalButtons}>
              <TouchableOpacity
                style={[styles.timeModalCancelButton, { borderColor: theme.dark ? '#636366' : '#E5E5EA' }]}
                onPress={() => setShowNewTaskTimePicker(false)}
              >
                <Text style={[styles.timeModalCancelText, { color: theme.dark ? '#8E8E93' : '#8E8E93' }]}>
                  Отмена
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Модальное окно выбора даты для фильтрации */}
      <Modal visible={showDateFilterModal} transparent animationType="fade" onRequestClose={() => setShowDateFilterModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.dateFilterModalContent, { backgroundColor: theme.dark ? '#1C1C1E' : '#FFFFFF' }]}>
            <View style={styles.dateFilterModalHeader}>
              <Text style={[styles.dateFilterModalTitle, { color: theme.dark ? '#FFFFFF' : '#000000' }]}>
                Выберите дату
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowDateFilterModal(false)}
              >
                <Icon source="close" size={24} color={theme.dark ? '#FFFFFF' : '#000000'} />
              </TouchableOpacity>
            </View>
            
            <TaskCalendar
              tasks={tasks}
              selectedDate={selectedFilterDate || new Date()}
              onDateSelect={(date) => {
                setSelectedFilterDate(date);
              }}
              onTaskPress={() => {}}
            />
            
            <View style={styles.dateFilterModalActions}>
              <TouchableOpacity
                style={[styles.dateFilterClearButton, { borderColor: theme.dark ? '#636366' : '#E5E5EA' }]}
                onPress={() => {
                  setSelectedFilterDate(null);
                  setShowDateFilterModal(false);
                }}
              >
                <Text style={[styles.dateFilterClearText, { color: theme.dark ? '#8E8E93' : '#8E8E93' }]}>
                  Сбросить
                </Text>
              </TouchableOpacity>
              
              <LinearGradient
                colors={['#7745dc', '#f34f8c']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.dateFilterSelectButton}
              >
                <TouchableOpacity
                  style={styles.dateFilterSelectButtonContent}
                  onPress={() => {
                    setShowDateFilterModal(false);
                  }}
                >
                  <Text style={styles.dateFilterSelectText}>Выбрать</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </View>
        </View>
      </Modal>
      
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  header: {
    fontSize: 30,
    fontWeight: '600',
    marginBottom: 16,
    paddingTop: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  inputContainer: {
    paddingHorizontal: 8,
    paddingVertical: 1,
    backgroundColor: 'transparent',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  input: {
    flex: 1,
    fontSize: 17,
    height: 36,
    borderWidth: 0,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 0,
    backgroundColor: '#F2F2F7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  addBtn: {
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },

  divider: {
    height: 0,
    marginVertical: 4,
  },
  listContent: {
    paddingBottom: 32,
    paddingTop: 0,
  },
  taskCard: {
    marginVertical: 2,
    marginHorizontal: 2,
    elevation: 2,
    padding: 0,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
  },
  taskTitle: {
    fontSize: 17,
    fontWeight: '500',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  swipeActionIcon: {
    margin: 0,
    padding: 0,
    marginBottom: -2,
  },
  taskMeta: {
    fontSize: 13,
    marginRight: 8,
    color: '#8E8E93',
    fontWeight: '400',
  },
  tag: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 4,
    marginRight: 0,
    fontWeight: '500',
    borderRadius: 4,
    overflow: 'hidden',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
    justifyContent: 'flex-start',
    paddingHorizontal: 4,
  },
  segmentedControlContainer: {
    flex: 2,
    marginRight: 10,
  },
  segmentedControl: {
    height: 34,
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#E9E9EB',
    padding: 2,
  },
  segmentButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
    backgroundColor: 'transparent',
    borderRadius: 6,
    marginHorizontal: 1,
  },
  selectedSegment: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
    borderRadius: 6,
  },
  leftSegment: {
    marginLeft: 0,
  },
  rightSegment: {
    marginRight: 0,
  },
  segmentButtonText: {
    fontSize: 13,
    textAlign: 'center',
    letterSpacing: -0.1,
  },
  dateButtonText: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  timeGroupHeader: {
    fontSize: 23,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 12,
  },
  emptyListText: {
    textAlign: 'center',
    marginTop: 32,
    fontSize: 16,
  },
  calendarButton: {
    marginRight: 8,
  },
  selectedDateText: {
    fontSize: 14,
    color: '#888',
    marginLeft: 4,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressText: {
    textAlign: 'right',
    color: '#8E8E93',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 2,
    fontWeight: '400',
  },
  optionsRow: {
    marginBottom: 8,
    gap: 12,
  },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  repeatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iosBlock: {
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#222',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  iosRowHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  iosCol: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  iosLabel: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    textAlign: 'left',
    color: '#000000',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  iosPickerWrap: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  iosPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F2F2F7',
    marginBottom: 2,
    marginTop: 2,
    borderWidth: 0.5,
    borderColor: '#E5E5EA',
  },
  iosPickerValue: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 4,
    color: '#8a44da',
    letterSpacing: -0.2,
  },
  iosInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 0.5,
    borderColor: '#E5E5EA',
    marginBottom: 0,
    minHeight: 40,
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
  },
  iosInputText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    letterSpacing: -0.2,
  },
  iosMeta: {
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.8,
    color: '#8E8E93',
    letterSpacing: -0.1,
  },
  iosButton: {
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: '#E5E5EA',
    marginBottom: 0,
  },
  iosButtonText: {
    color: '#8a44da',
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    minWidth: 270,
    alignItems: 'stretch',
  },
  modalOption: {
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  iosButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    gap: 12,
    marginHorizontal: 4,
  },
  iosCancelBtn: {
    flex: 1,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 0.5,
    borderColor: '#8a44da',
  },
  iosAddBtn: {
    flex: 1,
    borderRadius: 10,
    marginLeft: 8,
    backgroundColor: '#8a44da',
  },
  swipeDeleteButton: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '85%',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    marginTop: 5,
  },
  swipeDeleteText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingTop: 12,
  },
  viewModeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  fullWidthSegmentedControl: {
    marginBottom: 16,
  },
  fullWidthSegmentButton: {
    flex: 1, // Каждая кнопка занимает равную часть ширины
  },
  // Стили для современного интерфейса создания задач
  modernTaskCreator: {
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  creatorHeader: {
    marginBottom: 20,
    alignItems: 'center',
  },
  creatorTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modernSection: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  modernButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modernButtonText: {
    fontSize: 16,
    fontWeight: '400',
  },
  prioritySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priorityOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 4,
    borderRadius: 10,
    borderWidth: 2,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  priorityText: {
    fontSize: 14,
    fontWeight: '500',
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modernActionButtons: {
    flexDirection: 'row',
    marginTop: 8,
  },
  modernCancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  modernAddButton: {
    flex: 1,
    borderRadius: 12,
    marginLeft: 8,
  },
  addButtonContent: {
    padding: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Стили для модальных окон
  calendarModalContent: {
    margin: 20,
    borderRadius: 20,
    padding: 20,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  calendarModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  calendarModalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
  },
  timeModalContent: {
    margin: 20,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  timeModalHeader: {
    marginBottom: 20,
    alignItems: 'center',
  },
  timeModalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  timePickerContainer: {
    marginBottom: 20,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  timeOption: {
    width: '30%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    marginBottom: 8,
  },
  timeOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  customTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  customTimeText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  timeModalButtons: {
    flexDirection: 'row',
  },
  timeModalCancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  timeModalCancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
  repeatModalContent: {
    margin: 20,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  repeatModalHeader: {
    marginBottom: 20,
    alignItems: 'center',
  },
  repeatModalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  repeatOptionsContainer: {
    marginBottom: 20,
  },
  repeatOption: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 8,
  },
  repeatOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  repeatOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  repeatModalCancelButton: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  repeatModalCancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
  // Стили для выпадающего списка
  dropdownContainer: {
    position: 'relative',
  },
  dropdownMenu: {
    borderRadius: 12,
    marginTop: 8,
  },
  dropdownItem: {
    paddingVertical: 4,
  },
  dropdownItemText: {
    fontSize: 16,
  },
  // Стили для кастомного времени
  customTimeModalContent: {
    margin: 20,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  customTimeModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  customTimeModalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  webTimeInputContainer: {
    alignItems: 'center',
  },
  webTimeInputLabel: {
    fontSize: 16,
    marginBottom: 16,
  },
  webTimeInput: {
    borderRadius: 12,
    padding: 12,
    fontSize: 18,
    textAlign: 'center',
    width: 120,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#8a44da',
  },
  webTimeButtons: {
    flexDirection: 'row',
    width: '100%',
  },
  webTimeCancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginRight: 8,
  },
  webTimeCancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
  webTimeOkButton: {
    flex: 1,
    borderRadius: 12,
    marginLeft: 8,
  },
  webTimeOkButtonContent: {
    padding: 12,
    alignItems: 'center',
  },
  webTimeOkText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  nativeTimePickerContainer: {
    alignItems: 'center',
  },
  nativeTimeButtons: {
    flexDirection: 'row',
    width: '100%',
    marginTop: 20,
  },
  nativeTimeCancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginRight: 8,
  },
  nativeTimeCancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
  nativeTimeOkButton: {
    flex: 1,
    borderRadius: 12,
    marginLeft: 8,
  },
  nativeTimeOkButtonContent: {
    padding: 12,
    alignItems: 'center',
  },
  nativeTimeOkText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Стили для кнопки выбора даты
  dateFilterButton: {
    minWidth: 40,
    minHeight: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dateFilterGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  dateFilterText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Стили для модального окна фильтрации по дате
  dateFilterModalContent: {
    margin: 20,
    borderRadius: 20,
    padding: 20,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  dateFilterModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dateFilterModalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  dateFilterModalActions: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  dateFilterClearButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  dateFilterClearText: {
    fontSize: 16,
    fontWeight: '500',
  },
  dateFilterSelectButton: {
    flex: 1,
    borderRadius: 12,
  },
  dateFilterSelectButtonContent: {
    padding: 14,
    alignItems: 'center',
  },
  dateFilterSelectText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TasksScreen; 