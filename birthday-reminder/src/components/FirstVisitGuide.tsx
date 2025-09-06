import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FirstVisitGuideProps {
  onComplete: (name: string, birthDate: string) => void;
}

const FirstVisitGuide: React.FC<FirstVisitGuideProps> = ({ onComplete }) => {
  const [name, setName] = useState('');
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 验证输入
    if (!name.trim()) {
      setError('请输入您的姓名');
      return;
    }
    
    if (!year || !month || !day) {
      setError('请填写完整的生日信息');
      return;
    }
    
    // 验证日期有效性
    const birthDate = `${year}.${month.padStart(2, '0')}.${day.padStart(2, '0')}`;
    const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    
    if (isNaN(date.getTime())) {
      setError('请输入有效的生日日期');
      return;
    }
    
    // 调用完成回调函数
    onComplete(name, birthDate);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <Card className="w-full max-w-md border-2 border-yellow-400 shadow-xl rounded-lg">
        <CardHeader>
          <CardTitle className="text-lg sm:text-2xl text-center text-pink-600">欢迎使用生日提醒</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center mb-2 sm:mb-4 text-gray-600 text-sm sm:text-base">请先输入您的姓名和生日信息</p>
          <p className="text-center mb-3 sm:mb-6 text-yellow-600 font-medium text-sm sm:text-base">别忘了最好的自己</p>
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-2 sm:space-y-4">
              <div>
                <Label htmlFor="name" className="text-sm sm:text-base">姓名</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="请输入您的姓名"
                  className="text-sm sm:text-base"
                />
              </div>
              
              <div>
                <Label className="text-sm sm:text-base">生日</Label>
                <div className="flex gap-1 sm:gap-2">
                  <Input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="年"
                    min="1900"
                    max={new Date().getFullYear()}
                    className="text-sm sm:text-base"
                  />
                  <Input
                    type="number"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    placeholder="月"
                    min="1"
                    max="12"
                    className="text-sm sm:text-base"
                  />
                  <Input
                    type="number"
                    value={day}
                    onChange={(e) => setDay(e.target.value)}
                    placeholder="日"
                    min="1"
                    max="31"
                    className="text-sm sm:text-base"
                  />
                </div>
              </div>
              
              {error && (
                <div className="text-red-500 text-xs sm:text-sm text-center">{error}</div>
              )}
            </div>
          </form>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleSubmit}
            className="w-full bg-pink-500 hover:bg-pink-600 text-white text-sm sm:text-base py-2 sm:py-2.5"
          >
            开始使用
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default FirstVisitGuide;