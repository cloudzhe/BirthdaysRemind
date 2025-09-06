import React, { useState, useEffect, useMemo } from 'react';
import { differenceInDays, isBefore, parse, format, addYears, getYear } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Cake, Search, Edit, Bell, ChevronLeft, ChevronRight, Trash2, ChevronsUp, ChevronsDown, ChevronUp, ChevronDown, CalendarIcon, Clock, Gift } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
}
from "@/components/ui/context-menu";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
}
from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

// 导入学生数据
import peopleData from './data/people.json';
// 导入首次访问引导组件
import FirstVisitGuide from './components/FirstVisitGuide';

interface Student {
  id: number;
  name: string;
  birthDate: string;
  tags?: string[];
}

interface BirthdayPerson {
  id: number;
  name: string;
  birthDate: Date;
  daysUntilBirthday: number;
  upcomingAge: number;
  formattedDate: string;
  tags?: string[];
  isPinned?: boolean;
}

function App() {
  const [birthdayList, setBirthdayList] = useState<BirthdayPerson[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editingPerson, setEditingPerson] = useState<BirthdayPerson | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    year: '',
    month: '',
    day: '',
    tags: [] as string[]
  });
  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    year: '',
    month: '',
    day: '',
    tags: [] as string[]
  });
  const [currentReminderIndex, setCurrentReminderIndex] = useState(0);
  
  // 首次访问状态
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  
  // 加载状态
  const [isLoading, setIsLoading] = useState(false);
  
  // 用户生日状态
  const [userBirthday, setUserBirthday] = useState<BirthdayPerson | null>(null);
  
  // 在组件加载时处理JSON数据
  useEffect(() => {
    try {
      // 尝试从localStorage加载数据
      const savedData = localStorage.getItem('birthdayList');
      if (savedData) {
        // 如果有保存的数据，使用保存的数据
        const parsedData = JSON.parse(savedData);
        // 验证数据格式
        if (Array.isArray(parsedData) && parsedData.every(item => 
          typeof item === 'object' && 
          typeof item.id === 'number' &&
          typeof item.name === 'string' &&
          item.birthDate instanceof Date || typeof item.birthDate === 'string'
        )) {
          // 转换日期字符串为Date对象
          const processedData = parsedData.map(item => ({
            ...item,
            birthDate: typeof item.birthDate === 'string' ? new Date(item.birthDate) : item.birthDate
          }));
          setBirthdayList(processedData);
          
          // 检查是否有自己的生日卡片
          const hasSelfCard = processedData.some(item => 
            item.tags && item.tags.includes('自己')
          );
          
          // 仅在没有自己的生日卡片时显示引导界面
          if (hasSelfCard) {
            setIsFirstVisit(false);
          }
          return;
        }
      }
      
      // 如果没有保存的数据或数据格式不正确，处理现有的JSON数据
      const processedData: BirthdayPerson[] = [];
      
      if (Array.isArray(peopleData)) {
        (peopleData as Student[]).forEach(({ id, name, birthDate, tags }) => {
          const birthdayInfo = calculateBirthdayInfo(id, name, birthDate, tags);
          if (birthdayInfo) {
            processedData.push(birthdayInfo);
          }
        });
      }
      
      // 检查是否有自己的生日卡片
      const hasSelfCard = processedData.some(item => 
        item.tags && item.tags.includes('自己')
      );
      
      // 仅在没有自己的生日卡片时显示引导界面
      if (hasSelfCard) {
        setIsFirstVisit(false);
      }
      
      // 按照距离生日的天数排序
      const sortedData = processedData.sort((a, b) => a.daysUntilBirthday - b.daysUntilBirthday);
      setBirthdayList(sortedData);
    } catch (error) {
      console.error('Error loading birthday data:', error);
      setError('加载生日数据时出错');
    }
  }, []);

  // 获取需要提醒的生日列表
  const reminderBirthdays = useMemo(() => {
    return birthdayList.filter(person => 
      person.daysUntilBirthday === 5 || 
      person.daysUntilBirthday === 3 || 
      person.daysUntilBirthday === 1
    );
  }, [birthdayList]);

  // 当提醒列表改变时，重置当前索引
  useEffect(() => {
    if (reminderBirthdays.length > 0) {
      setCurrentReminderIndex(0);
    }
  }, [reminderBirthdays]);

  const calculateBirthdayInfo = (id: number, name: string, birthDateStr: string, tags?: string[]): BirthdayPerson | null => {
    try {
      // 处理日期格式，支持 ISO 格式和 YYYY.MM.DD 格式
      let birthDate;
      
      // 检查是否为 ISO 日期格式 (如: 2025-03-02T16:00:00.000Z)
      if (birthDateStr.includes('T') && birthDateStr.includes('Z')) {
        birthDate = new Date(birthDateStr);
      } else {
        // 处理特殊情况，如月份或日期为00的情况
        let fixedDateStr = birthDateStr;
        
        // 检查并修复日期中的00
        const dateParts = birthDateStr.split('.');
        if (dateParts.length === 3) {
          const year = dateParts[0];
          const month = dateParts[1] === '00' ? '01' : dateParts[1];
          const day = dateParts[2] === '00' ? '01' : dateParts[2];
          fixedDateStr = `${year}.${month}.${day}`;
        }
        
        birthDate = parse(fixedDateStr, 'yyyy.MM.dd', new Date());
      }
      
      if (isNaN(birthDate.getTime())) {
        console.error(`Invalid date format for ${name}: ${birthDateStr}`);
        return null;
      }

      const today = new Date();
      const currentYear = getYear(today);
      
      // 计算今年的生日
      let nextBirthday = new Date(birthDate);
      nextBirthday.setFullYear(currentYear);
      
      // 如果今年的生日已经过了，计算明年的生日
      if (isBefore(nextBirthday, today)) {
        nextBirthday = addYears(nextBirthday, 1);
      }
      
      const daysUntilBirthday = differenceInDays(nextBirthday, today);
      const upcomingAge = nextBirthday.getFullYear() - birthDate.getFullYear();
      const formattedDate = format(birthDate, 'MM月dd日', { locale: zhCN });

      return {
        id,
        name,
        birthDate,
        daysUntilBirthday,
        upcomingAge,
        formattedDate,
        tags
      };
    } catch (error) {
      console.error(`Error processing birthday for ${name}:`, error);
      return null;
    }
  };

  // 处理首次访问完成
  const handleFirstVisitComplete = (name: string, birthDate: string) => {
    // 创建用户生日信息
    const userInfo = calculateBirthdayInfo(0, name, birthDate, ['自己']);
    
    if (userInfo) {
      // 设置用户信息并置顶
      const userBirthdayWithPinned = { ...userInfo, isPinned: true };
// 设置用户生日状态
setUserBirthday(userBirthdayWithPinned);
      
      // 处理现有的JSON数据
      const processedData: BirthdayPerson[] = [];
      
      (peopleData as Student[]).forEach(({ id, name, birthDate, tags }) => {
        const birthdayInfo = calculateBirthdayInfo(id, name, birthDate, tags);
        if (birthdayInfo) {
          processedData.push(birthdayInfo);
        }
      });
      
      // 将用户信息添加到列表顶部
      const updatedList = [userBirthdayWithPinned, ...processedData];
      
      // 按照距离生日的天数排序，但保持用户信息在顶部
      const sortedData = updatedList.sort((a, b) => {
        // 如果是置顶项，保持在前面
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        // 否则按天数排序
        return a.daysUntilBirthday - b.daysUntilBirthday;
      });
      
      setBirthdayList(sortedData);
      
      // 标记已完成首次访问
      setIsFirstVisit(false);
      localStorage.setItem('hasCompletedFirstVisit', 'true');
      localStorage.setItem('userBirthday', JSON.stringify(userBirthdayWithPinned));
      
      // 保存数据到localStorage
      localStorage.setItem('birthdayList', JSON.stringify(sortedData));
    }
  };



  const handleEdit = (person: BirthdayPerson) => {
    // 设置编辑状态
    setEditingPerson(person);
    // 解析生日日期
    const birthDate = format(person.birthDate, 'yyyy.MM.dd');
    const [year, month, day] = birthDate.split('.');
    // 初始化编辑表单
    setEditForm({
      name: person.name,
      year: year || '',
      month: month || '',
      day: day || '',
      tags: person.tags || []
    });
  };

  const handleSaveEdit = () => {
    if (!editingPerson) return;
    
    // 验证输入
    if (!editForm.name || !editForm.year || !editForm.month || !editForm.day) {
      setError('请填写完整的姓名和生日信息');
      return;
    }
    
    // 生成生日日期字符串
    const birthDate = `${editForm.year}.${editForm.month.padStart(2, '0')}.${editForm.day.padStart(2, '0')}`;
    
    // 重新计算生日信息
    const updatedPerson = calculateBirthdayInfo(
      editingPerson.id,
      editForm.name,
      birthDate,
      editForm.tags || []
    );
    
    if (updatedPerson) {
      // 更新生日列表
      const updatedList = birthdayList.map(person => 
        person.id === editingPerson.id ? updatedPerson : person
      );
      
      // 按照距离生日的天数排序
      const sortedData = updatedList.sort((a, b) => a.daysUntilBirthday - b.daysUntilBirthday);
      setBirthdayList(sortedData);
      
      // 关闭编辑模态框
      setEditingPerson(null);
    } else {
      setError('请输入有效的姓名和生日格式 (YYYY.MM.DD)');
    }
  };

  const handleAddNew = () => {
    // 打开添加模态框
    setIsAdding(true);
    // 初始化添加表单
    setAddForm({ name: '', year: '', month: '', day: '', tags: [] });
  };

  const handleSaveAdd = () => {
    // 验证输入
    if (!addForm.name || !addForm.year || !addForm.month || !addForm.day) {
      setError('请填写完整的姓名和生日信息');
      return;
    }
    
    // 生成生日日期字符串
    const birthDate = `${addForm.year}.${addForm.month.padStart(2, '0')}.${addForm.day.padStart(2, '0')}`;
    
    // 生成新的ID
    const newId = birthdayList.length > 0 ? Math.max(...birthdayList.map(p => p.id)) + 1 : 1;
    
    // 获取标签数据
    const tags = addForm.tags || [];
    
    // 计算新生日信息
    const newPerson = calculateBirthdayInfo(newId, addForm.name, birthDate, tags);
    
    if (newPerson) {
      // 添加到生日列表
      const updatedList = [...birthdayList, newPerson];
      
      // 按照距离生日的天数排序
      const sortedData = updatedList.sort((a, b) => a.daysUntilBirthday - b.daysUntilBirthday);
      setBirthdayList(sortedData);
      
      // 关闭添加模态框
      setIsAdding(false);
      
      // 清空表单
      setAddForm({ name: '', year: '', month: '', day: '', tags: [] });
    } else {
      setError('请输入有效的姓名和生日格式 (YYYY.MM.DD)');
    }
  };

  const handleDelete = (id: number) => {
    // 检查要删除的人员是否包含"自己"标签
    const personToDelete = birthdayList.find(person => person.id === id);
    if (personToDelete && personToDelete.tags && personToDelete.tags.includes('自己')) {
      // 如果包含"自己"标签，不允许删除
      setError('我即是一切');
      return;
    }
    // 从生日列表中移除指定ID的人员
    const updatedList = birthdayList.filter(person => person.id !== id);
    setBirthdayList(updatedList);
  };

  // 排序功能函数
  const moveItemToTop = (id: number) => {
    const itemIndex = birthdayList.findIndex(person => person.id === id);
    if (itemIndex === -1) return;
    
    const updatedList = [...birthdayList];
    const [removedItem] = updatedList.splice(itemIndex, 1);
    
    // 设置isPinned属性为true
    const pinnedItem = { ...removedItem, isPinned: true };
    
    // 检查该项是否是"自己"标签
    const isItemSelf = pinnedItem.tags && pinnedItem.tags.includes('自己');
    
    if (isItemSelf) {
      // 如果是"自己"标签，放在最前面
      updatedList.unshift(pinnedItem);
    } else {
      // 对于非"自己"项，找到第一个非"自己"置顶项的位置
      let insertIndex = 0;
      while (insertIndex < updatedList.length) {
        const currentItem = updatedList[insertIndex];
        if (!currentItem.isPinned || 
            !currentItem.tags || 
            !currentItem.tags.includes('自己')) {
          break;
        }
        insertIndex++;
      }
      updatedList.splice(insertIndex, 0, pinnedItem);
    }
    
    setBirthdayList(updatedList);
  };

  const unpinItem = (id: number) => {
    const updatedList = birthdayList.map(person => 
      person.id === id ? { ...person, isPinned: false } : person
    );
    setBirthdayList(updatedList);
  };

  const moveItemUp = (id: number) => {
    const itemIndex = birthdayList.findIndex(person => person.id === id);
    if (itemIndex <= 0) return; // 已经在顶部或不存在
    
    // 检查上一项是否是"自己"标签
    const upperItem = birthdayList[itemIndex - 1];
    const isUpperItemSelf = upperItem.tags && upperItem.tags.includes('自己');
    
    // 检查上一项是否是置顶项
    const isUpperItemPinned = upperItem.isPinned;
    
    // 如果上一项是置顶项或"自己"标签，则不能上移
    if (isUpperItemPinned || isUpperItemSelf) return;
    
    const updatedList = [...birthdayList];
    [updatedList[itemIndex - 1], updatedList[itemIndex]] = [updatedList[itemIndex], updatedList[itemIndex - 1]];
    
    setBirthdayList(updatedList);
  };

  const moveItemDown = (id: number) => {
    const itemIndex = birthdayList.findIndex(person => person.id === id);
    if (itemIndex === -1 || itemIndex === birthdayList.length - 1) return; // 已经在底部或不存在
    
    // 检查下一项是否是"自己"标签
    const lowerItem = birthdayList[itemIndex + 1];
    const isLowerItemSelf = lowerItem.tags && lowerItem.tags.includes('自己');
    
    // 检查当前项是否是置顶项
    const isCurrentItemPinned = birthdayList[itemIndex].isPinned;
    
    // 如果下一项是"自己"标签，则不能下移
    if (isLowerItemSelf) return;
    
    // 如果当前项是置顶项，不能下移到普通项之下
    if (isCurrentItemPinned) {
      // 检查下一项是否不是置顶项
      if (!lowerItem.isPinned) return;
    }
    
    const updatedList = [...birthdayList];
    [updatedList[itemIndex], updatedList[itemIndex + 1]] = [updatedList[itemIndex + 1], updatedList[itemIndex]];
    
    setBirthdayList(updatedList);
  };

  // 多选删除功能
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  
  const toggleSelect = (id: number) => {
    if (isMultiSelectMode) {
      setSelectedIds(prev => 
        prev.includes(id) 
          ? prev.filter(selectedId => selectedId !== id)
          : [...prev, id]
      );
    }
  };
  
  const deleteSelected = () => {
    if (selectedIds.length === 0) return;
    
    // 检查选中的人员中是否包含"自己"标签
    const hasSelfTag = selectedIds.some(id => {
      const person = birthdayList.find(p => p.id === id);
      return person && person.tags && person.tags.includes('自己');
    });
    
    if (hasSelfTag) {
      // 如果包含"自己"标签，不允许删除
      setError('不能删除包含"自己"标签的卡片');
      return;
    }
    
    const updatedList = birthdayList.filter(person => !selectedIds.includes(person.id));
    setBirthdayList(updatedList);
    setSelectedIds([]);
    setIsMultiSelectMode(false);
  };
  
  // 在取消多选模式时清除选中状态
  useEffect(() => {
    if (!isMultiSelectMode) {
      setSelectedIds([]);
    }
  }, [isMultiSelectMode]);

  // 自动保存数据到localStorage
  useEffect(() => {
    if (birthdayList.length > 0) {
      localStorage.setItem('birthdayList', JSON.stringify(birthdayList));
    }
  }, [birthdayList]);


  // 获取所有标签作为分组选项
  const groups = Array.from(new Set(birthdayList.flatMap(person => person.tags || []))) as string[];
  
  // 当前选中的分组
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  
  // 过滤后的生日列表
  const filteredBirthdayList = birthdayList.filter(person => {
    const matchesSearch = person.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGroup = selectedGroup ? (person.tags || []).includes(selectedGroup) : true;
    return matchesSearch && matchesGroup;
  });



  // 数据导出为JSON文件功能
  const exportData = () => {
    const dataStr = JSON.stringify(birthdayList, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'birthday-data.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // 处理文件导入功能
  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedData = JSON.parse(content) as Student[];
        
        // 验证导入的数据格式
        if (Array.isArray(importedData) && importedData.every(item => 
          typeof item === 'object' && 
          typeof item.id === 'number' &&
          typeof item.name === 'string' &&
          typeof item.birthDate === 'string'
        )) {
          // 转换导入的数据格式
          const processedData: BirthdayPerson[] = [];
          importedData.forEach(({ id, name, birthDate, tags }) => {
            const birthdayInfo = calculateBirthdayInfo(id, name, birthDate, tags);
            if (birthdayInfo) {
              processedData.push(birthdayInfo);
            }
          });
          
          // 合并现有数据和导入的数据，避免重复
          const mergedData = [...birthdayList];
          const existingIds = new Set(birthdayList.map(person => person.id));
          
          processedData.forEach(person => {
            // 只添加不存在的项目
            if (!existingIds.has(person.id)) {
              mergedData.push(person);
              existingIds.add(person.id);
            }
          });
          
          // 按照距离生日的天数排序
          const sortedData = mergedData.sort((a, b) => a.daysUntilBirthday - b.daysUntilBirthday);
          setBirthdayList(sortedData);
          alert('数据导入成功');
        } else {
          alert('导入的数据格式不正确');
        }
      } catch (error) {
        console.error('导入失败:', error);
        alert('导入失败，请检查文件格式是否正确');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* 首次访问引导 */}
        {isFirstVisit && (
          <FirstVisitGuide onComplete={handleFirstVisitComplete} />
        )}
        
        <header className="text-center mb-6 md:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-pink-600 mb-2">生日提醒</h1>
          <p className="text-gray-600 text-sm sm:text-base">不要忘记为你关心的人送上生日祝福</p>
          <div className="mt-3 text-xs sm:text-sm text-gray-500">
            今天是 {format(new Date(), 'yyyy年MM月dd日', { locale: zhCN })}，
            共有 {birthdayList.length} 个人的生日信息
          </div>
        </header>

        {/* 生日提醒区域 */}
        {reminderBirthdays.length > 0 && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 p-3 mb-6 rounded-lg shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center">
                <Bell className="text-yellow-500 mr-2" size={20} />
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-yellow-800">生日提醒</h3>
                  <p className="text-yellow-700 text-sm">
                    {reminderBirthdays[currentReminderIndex].name} 的生日还有 {reminderBirthdays[currentReminderIndex].daysUntilBirthday} 天
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  onClick={() => setCurrentReminderIndex((prev) => (prev > 0 ? prev - 1 : reminderBirthdays.length - 1))}
                  disabled={reminderBirthdays.length <= 1}
                >
                  <ChevronLeft size={16} />
                </Button>
                <span className="text-sm text-yellow-700">
                  {currentReminderIndex + 1} / {reminderBirthdays.length}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  onClick={() => setCurrentReminderIndex((prev) => (prev < reminderBirthdays.length - 1 ? prev + 1 : 0))}
                  disabled={reminderBirthdays.length <= 1}
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 mb-6 md:mb-8">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  type="text"
                  placeholder="搜索姓名..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-full text-sm"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <select 
                  value={selectedGroup || ''}
                  onChange={(e) => setSelectedGroup(e.target.value || null)}
                  className="border border-gray-300 rounded-md px-3 py-1.5 text-sm sm:py-1.5 sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto h-8"
                >
                  <option value="">全部标签</option>
                  {groups.map(group => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>
                <Button onClick={handleAddNew} className="h-8 px-3 py-1.5 text-sm flex items-center gap-1">
                  <Cake size={14} />
                  <span>添加</span>
                </Button>
                <Button 
                  onClick={() => setIsMultiSelectMode(!isMultiSelectMode)} 
                  variant={isMultiSelectMode ? "default" : "outline"}
                  className="h-8 px-3 py-1.5 text-sm flex items-center gap-1"
                >
                  <span>{isMultiSelectMode ? '取消' : '多选'}</span>
                </Button>
                {isMultiSelectMode && selectedIds.length > 0 && (
                  <Button onClick={deleteSelected} variant="destructive" className="h-8 px-3 py-1.5 text-sm flex items-center gap-1">
                    <Trash2 size={14} />
                    <span>删除({selectedIds.length})</span>
                  </Button>
                )}
              </div>
            </div>
            
            {/* 数据管理按钮 */}
            <div className="flex gap-2 mt-3 flex-wrap">
              <Button onClick={exportData} variant="outline" className="h-8 px-3 py-1.5 text-sm flex items-center gap-1">
                <span>导出</span>
              </Button>
              <Button onClick={() => document.getElementById('import-file')?.click()} variant="outline" className="h-8 px-3 py-1.5 text-sm flex items-center gap-1">
                <span>导入</span>
              </Button>
              <input
                id="import-file"
                type="file"
                accept=".json"
                onChange={handleFileImport}
                className="hidden"
              />
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-md">
                {error}
              </div>
            )}
          </div>

        {false ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">正在处理数据...</p>
          </div>
        ) : filteredBirthdayList.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {filteredBirthdayList.map((person) => (
              <ContextMenu key={person.id}>
                <ContextMenuTrigger>
                  <Card className={`overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${selectedIds.includes(person.id) ? 'ring-2 ring-blue-500' : ''} ${person.daysUntilBirthday <= 7 ? 'border-pink-400 border-2' : 'border-gray-200'} ${person.tags && person.tags.includes('自己') ? 'border-2 border-yellow-400' : ''}`}>
                    <div className={`h-2 ${person.tags && person.tags.includes('自己') ? 'bg-yellow-500' : (person.daysUntilBirthday <= 7 ? 'bg-pink-500' : person.daysUntilBirthday <= 30 ? 'bg-blue-500' : 'bg-green-500')}`}></div>
                    <CardContent className="p-3 md:p-6">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center">
                          {isMultiSelectMode && (
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(person.id)}
                              onChange={() => toggleSelect(person.id)}
                              className="mr-2 h-4 w-4 text-blue-600 rounded"
                            />
                          )}
                          <h3 className="text-lg sm:text-xl font-bold text-gray-800">{person.name}</h3>
                          <div className="flex flex-wrap gap-1 ml-2">
                            {person.tags && person.tags.length > 0 && (
                              person.tags
                                .filter(tag => tag !== '自己') // 过滤掉"自己"标签
                                .map((tag, index) => (
                                  // 如果是置顶项且不是"自己"标签，显示金色标签
                                  <span 
                                    key={index} 
                                    className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium ${person.isPinned && tag !== '自己' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}
                                  >
                                    {tag}
                                  </span>
                                ))
                            )}
                          </div>
                        </div>
                        <div className={`rounded-full px-2 py-1 text-xs font-medium ${person.daysUntilBirthday <= 7 ? 'bg-pink-100 text-pink-800' : person.daysUntilBirthday <= 30 ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                            {person.daysUntilBirthday === 0 ? '今天' : `${person.daysUntilBirthday}天后`}
                          </div>
                      </div>
                      
                      {/* 如果是置顶项且没有"自己"标签，显示金色的置顶标识 */}
                      {person.isPinned && (!person.tags || !person.tags.includes('自己')) && (
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                            <ChevronsUp className="w-3 h-3 mr-1" />
                            置顶
                          </Badge>
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        <div className="flex items-center text-xs sm:text-sm text-gray-600">
                          <CalendarIcon size={16} className="mr-1.5 text-gray-400" />
                          <span>生日日期: {person.formattedDate}</span>
                        </div>
                        
                        <div className="flex items-center text-xs sm:text-sm text-gray-600">
                          <Cake size={16} className="mr-1.5 text-gray-400" />
                          <span>即将到来: {person.upcomingAge}岁生日</span>
                        </div>
                        
                        <div className="flex items-center text-xs sm:text-sm text-gray-600">
                          <Clock size={16} className="mr-1.5 text-gray-400" />
                          <span>
                            {person.daysUntilBirthday === 0 
                              ? '今天是生日！' 
                              : person.daysUntilBirthday === 1 
                                ? '明天就是生日！' 
                                : person.daysUntilBirthday <= 7 
                                  ? '本周内过生日' 
                                  : person.daysUntilBirthday <= 30 
                                    ? '本月内过生日' 
                                    : '距离生日还有一段时间'}
                          </span>
                        </div>
                      </div>
                      
                      {person.daysUntilBirthday <= 7 && (
                        <div className="mt-4 pt-4 border-t border-dashed border-gray-200">
                          <div className="flex items-center text-pink-600">
                            <Gift size={18} className="mr-2" />
                            <span className="font-medium">别忘了准备礼物哦！</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </ContextMenuTrigger>
              <ContextMenuContent>
                  <ContextMenuItem onClick={() => handleEdit(person)}>
                    <Edit className="mr-2 h-4 w-4" />
                    <span>编辑</span>
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => handleDelete(person.id)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>删除</span>
                  </ContextMenuItem>
                  {person.isPinned ? (
                    <ContextMenuItem onClick={() => unpinItem(person.id)}>
                      <ChevronsDown className="mr-2 h-4 w-4" />
                      <span>取消置顶</span>
                    </ContextMenuItem>
                  ) : (
                    <ContextMenuItem onClick={() => moveItemToTop(person.id)}>
                      <ChevronsUp className="mr-2 h-4 w-4" />
                      <span>置顶</span>
                    </ContextMenuItem>
                  )}
                  <ContextMenuItem onClick={() => moveItemUp(person.id)}>
                    <ChevronUp className="mr-2 h-4 w-4" />
                    <span>上移</span>
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => moveItemDown(person.id)}>
                    <ChevronDown className="mr-2 h-4 w-4" />
                    <span>下移</span>
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 sm:py-12 bg-white rounded-lg shadow">
            {birthdayList.length === 0 ? (
              <>
                <Cake size={48} className="mx-auto text-gray-300 mb-3 sm:mb-4" />
                <h3 className="text-lg sm:text-xl font-medium text-gray-600 mb-1 sm:mb-2">暂无生日数据</h3>
                <p className="text-sm text-gray-500">请检查JSON数据文件</p>
              </>
            ) : (
              <>
                <Search size={48} className="mx-auto text-gray-300 mb-3 sm:mb-4" />
                <h3 className="text-lg sm:text-xl font-medium text-gray-600">未找到匹配的结果</h3>
              </>
            )}
          </div>
        )}
      </div>
      
      {/* 编辑模态框 */}
      <Dialog open={!!editingPerson} onOpenChange={(open) => !open && setEditingPerson(null)}>
        <DialogContent className="sm:max-w-[425px] w-[95vw] max-w-[95vw] sm:w-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">编辑生日信息</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2">
              <Label htmlFor="name" className="text-sm sm:text-right">
                姓名
              </Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                className="col-span-1 sm:col-span-3"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2">
                  <Label className="text-sm sm:text-right">
                    生日
                  </Label>
                  <div className="col-span-1 sm:col-span-3 flex flex-col sm:flex-row gap-2">
                    <select
                      value={editForm.year || ''}
                      onChange={(e) => setEditForm({...editForm, year: e.target.value})}
                      className="flex-1 p-2 text-sm border border-gray-300 rounded-md w-full"
                    >
                      <option value="">年</option>
                      {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                    <select
                      value={editForm.month || ''}
                      onChange={(e) => setEditForm({...editForm, month: e.target.value})}
                      className="flex-1 p-2 text-sm border border-gray-300 rounded-md w-full"
                    >
                      <option value="">月</option>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                        <option key={month} value={month}>{month}</option>
                      ))}
                    </select>
                    <select
                      value={editForm.day || ''}
                      onChange={(e) => setEditForm({...editForm, day: e.target.value})}
                      className="flex-1 p-2 text-sm border border-gray-300 rounded-md w-full"
                    >
                      <option value="">日</option>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2">
                  <Label htmlFor="edit-tags" className="text-sm sm:text-right">
                    标签
                  </Label>
                  <Input
                    id="edit-tags"
                    value={editForm.tags?.join(", ") || ""}
                    onChange={(e) => setEditForm({...editForm, tags: e.target.value.split(",").map(tag => tag.trim()).filter(tag => tag !== "")})}
                    className="col-span-1 sm:col-span-3"
                    placeholder="用逗号分隔标签，如：朋友, 同事"
                  />
                </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveEdit} className="text-sm px-4 py-2">保存修改</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 添加模态框 */}
      <Dialog open={isAdding} onOpenChange={(open) => !open && setIsAdding(false)}>
        <DialogContent className="sm:max-w-[425px] w-[95vw] max-w-[95vw] sm:w-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">添加生日信息</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2">
              <Label htmlFor="add-name" className="text-sm sm:text-right">
                姓名
              </Label>
              <Input
                id="add-name"
                value={addForm.name}
                onChange={(e) => setAddForm({...addForm, name: e.target.value})}
                className="col-span-1 sm:col-span-3"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2">
                <Label className="text-sm sm:text-right">
                  生日
                </Label>
                <div className="col-span-1 sm:col-span-3 flex flex-col sm:flex-row gap-2">
                  <select
                    value={addForm.year || ''}
                    onChange={(e) => setAddForm({...addForm, year: e.target.value})}
                    className="flex-1 p-2 text-sm border border-gray-300 rounded-md w-full"
                  >
                    <option value="">年</option>
                    {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                  <select
                    value={addForm.month || ''}
                    onChange={(e) => setAddForm({...addForm, month: e.target.value})}
                    className="flex-1 p-2 text-sm border border-gray-300 rounded-md w-full"
                  >
                    <option value="">月</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                      <option key={month} value={month}>{month}</option>
                    ))}
                  </select>
                  <select
                    value={addForm.day || ''}
                    onChange={(e) => setAddForm({...addForm, day: e.target.value})}
                    className="flex-1 p-2 text-sm border border-gray-300 rounded-md w-full"
                  >
                    <option value="">日</option>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2">
                <Label htmlFor="add-tags" className="text-sm sm:text-right">
                  标签
                </Label>
                <Input
                  id="add-tags"
                  value={addForm.tags?.join(", ") || ""}
                  onChange={(e) => setAddForm({...addForm, tags: e.target.value.split(",").map(tag => tag.trim()).filter(tag => tag !== "")})}
                  className="col-span-1 sm:col-span-3"
                  placeholder="用逗号分隔标签，如：朋友, 同事"
                />
              </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveAdd} className="text-sm px-4 py-2">添加</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;