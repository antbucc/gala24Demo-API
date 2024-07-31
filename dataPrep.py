import json

def process_file(file_path, main_skill):
    # Load the JSON data from the provided file
    with open(file_path) as f:
        data = json.load(f)

    # Create a list to store all questions
    all_questions = []

    # Process each topic and add the topicID and mainSkill fields to each question
    for topic, questions in data.items():
        for question in questions:
            question['topicID'] = topic
            question['Skill'] = main_skill
            all_questions.append(question)

    return all_questions

def merge_files(output_file, file_paths_and_skills):
    merged_questions = []

    # Process each file and merge the questions
    for file_path, main_skill in file_paths_and_skills:
        questions = process_file(file_path, main_skill)
        merged_questions.extend(questions)

    # Save the merged questions to a new JSON file
    with open(output_file, 'w') as f:
        json.dump(merged_questions, f, indent=4)

    print(f"Merged questions saved as: {output_file}")

# Define the file paths, main skills, and output file name
file_paths_and_skills = [
    ('plastic_pollution_questions.json', 'Plastic'),
    ('bee_conservation_questions.json', 'Bee'),
    ('Detergents_questions.json', 'Detergents')
]
output_file = 'merged_questions.json'

# Merge the files
merge_files(output_file, file_paths_and_skills)
